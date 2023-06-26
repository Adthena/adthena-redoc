import { FieldModel, MediaContentModel, MediaTypeModel } from './models';
import { SecurityScheme } from './models/SecurityRequirement';
import { getSerializedValue, serializeParameterValue } from '../utils';
import { PARAM_STYLE } from '../constants/parameter-style';
import { REQUEST_HEADERS } from '../constants/request-headers';
import { MIME_TYPES } from '../constants/mime-types';

export interface FetchBodyOptions {
  body?: any;
  method: string;
}

export interface RequestGeneratorOptions {
  apiKeys: SecurityScheme[];
  method: string;
  parameters: FieldModel[];
  path: string;
  requestBody?: MediaContentModel;
  serverUrl: string;
}

export interface FetchUrlOptions {
  cookieParams?: URLSearchParams;
  fetchUrl: string;
  fullUrl: string;
  queryParams?: URLSearchParams;
}

/**
 * @license
 * MIT License
 *
 * Copyright (c) 2022 Mrinmoy Majumdar
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
export abstract class RequestGenerator implements RequestGeneratorOptions {
  apiKeys: SecurityScheme[];
  method: string;
  parameters: FieldModel[];
  path: string;
  requestBody?: MediaContentModel | undefined;
  serverUrl: string;

  protected constructor(options: RequestGeneratorOptions) {
    this.apiKeys = options.apiKeys;
    this.method = options.method;
    this.parameters = options.parameters;
    this.path = options.path.startsWith('/') ? options.path : `/${options.path}`;
    this.requestBody = options.requestBody;
    this.serverUrl = options.serverUrl;
  }

  protected buildFetchUrl(): FetchUrlOptions {
    let fetchUrl = this.path;

    // Generate URL using Path Params
    this.parameters
      .filter(param => param.in === PARAM_STYLE.PATH && typeof param.example !== 'undefined')
      .forEach(param => {
        fetchUrl = fetchUrl.replace(
          `{${param.name}}`,
          serializeParameterValue(param, param.example as string),
        );
      });

    // Query Params
    const urlQueryParams = new URLSearchParams();
    const queryParameters = this.parameters.filter(param => param.in === PARAM_STYLE.QUERY);
    queryParameters.forEach((param: FieldModel) => {
      const value = param.example ?? param.schema.default ?? param.schema.enum?.[0];

      if (typeof value !== 'undefined') {
        const serializedParam = getSerializedValue(param, value);
        if (serializedParam.includes('&')) {
          const values = serializedParam.split('&').map(val => val.split('=').pop());
          values.forEach(val => {
            urlQueryParams.append(param.name, val);
          });
        } else {
          const [, serializedValue] = serializedParam.split('=');
          urlQueryParams.append(param.name, serializedValue);
        }
      }
    });

    fetchUrl = `${this.serverUrl.replace(/\/$/, '')}${fetchUrl}`;

    let urlQueryParamString = '';
    let fullUrl = fetchUrl;

    if (urlQueryParams.toString()) {
      const params: string[] = [];
      urlQueryParams.forEach((value, key) => {
        params.push(`${key}=${value}`);
      });
      urlQueryParamString = params.join('&');
    }
    if (urlQueryParamString.length !== 0) {
      fullUrl = `${fullUrl}?${urlQueryParamString}`;
    }

    // Add authentication Query-Param if provided
    this.apiKeys
      .filter(scheme => scheme.in === PARAM_STYLE.QUERY)
      .forEach(scheme => {
        fullUrl = `${fullUrl}${fullUrl.includes('?') ? '&' : '?'}${
          scheme.name
        }=${encodeURIComponent(scheme.displayName)}`;
      });

    const cookieParams = new URLSearchParams();
    this.parameters
      .filter(param => param.in === PARAM_STYLE.COOKIE)
      .forEach(param => {
        const value = param.example ?? param.schema.default;

        if (typeof value !== 'undefined') {
          const serializedParam = getSerializedValue(param, value);
          const [, serializedValue] = serializedParam.split('=');
          cookieParams.append(param.name, serializedValue);
        }
      });

    return {
      cookieParams,
      fetchUrl,
      fullUrl,
      queryParams: urlQueryParams,
    };
  }

  protected buildFetchHeaders(): Headers {
    const defaultAcceptHeader = MIME_TYPES.APPLICATION_JSON;
    const reqHeaders = new Headers();

    // Add Authentication Header if provided
    this.apiKeys
      .filter(scheme => scheme.in === PARAM_STYLE.HEADER)
      .forEach(scheme => {
        reqHeaders.append(<string>scheme.name, scheme.displayName);
      });

    // Add Header Params
    this.parameters
      .filter(param => param.in === PARAM_STYLE.HEADER)
      .forEach(param => {
        if (param.example) {
          reqHeaders.append(param.name, param.example);
        } else if (Array.isArray(param.examples)) {
          param.examples.forEach(example => {
            reqHeaders.append(param.name, example);
          });
        }
      });

    if (this.requestBody?.mediaTypes.length) {
      const [mediaType] = this.requestBody.mediaTypes;
      if (mediaType.name !== MIME_TYPES.MULTIPART_FORM_DATA) {
        // For multipart/form-data dont set the content-type to allow creation of browser generated part boundaries
        reqHeaders.append(REQUEST_HEADERS.CONTENT_TYPE, mediaType.name);
      }
    }

    if (!reqHeaders.get(REQUEST_HEADERS.ACCEPT)) {
      reqHeaders.append(REQUEST_HEADERS.ACCEPT, defaultAcceptHeader);
    }

    return reqHeaders;
  }

  protected buildFetchBodyOptions(): FetchBodyOptions {
    const fetchOptions: FetchBodyOptions = {
      method: this.method.toUpperCase(),
    };

    const [mediaType = {} as MediaTypeModel] = this.requestBody?.mediaTypes || [];
    const { examples, name } = mediaType;

    if (examples) {
      if (name === MIME_TYPES.APPLICATION_FORM_URLENCODED && examples) {
        const formUrlParams = new URLSearchParams();
        Object.entries(examples)
          .filter(([, example]) => !example.mime.includes('file'))
          .forEach(([key, example]) => {
            if (!Array.isArray(example.value)) {
              if (example.value) {
                formUrlParams.append(key, example.value);
              }
            } else {
              const vals =
                example.value && Array.isArray(example.value) ? example.value.join(',') : '';
              formUrlParams.append(key, vals);
            }
          });
        fetchOptions.body = formUrlParams;
      } else if (name === MIME_TYPES.MULTIPART_FORM_DATA) {
        const formDataParams = new FormData();
        const [{ value }] = Object.values(examples as object);
        const formDataEls = Object.entries(value);
        formDataEls.forEach(([key, propertyValue]) => {
          if (!Array.isArray(propertyValue)) {
            formDataParams.append(key, <string>propertyValue);
          } else if (propertyValue && Array.isArray(propertyValue)) {
            formDataParams.append(key, propertyValue.join(','));
          }
        });
        fetchOptions.body = formDataParams;
      } else if (
        /^audio\/|^image\/|^video\/|^font\/|tar$|zip$|7z$|rtf$|msword$|excel$|\/pdf$|\/octet-stream$/.test(
          name,
        )
      ) {
        const [{ value }] = Object.values(examples as object);
        fetchOptions.body = value;
      } else if (
        name === MIME_TYPES.APPLICATION_JSON ||
        name === MIME_TYPES.APPLICATION_XML ||
        name.includes('text')
      ) {
        const [{ value }] = Object.values(examples as object);

        fetchOptions.body = value;
      }
    }

    return fetchOptions;
  }

  protected abstract getSourceCode(): string;
}
