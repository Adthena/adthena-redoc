import { FieldModel } from './Field';
import { SecurityScheme } from './SecurityRequirement';
import { MediaContentModel } from './MediaContent';
import { getSerializedValue } from '../../utils';
import { MediaTypeModel } from './MediaType';

const NEW_LINE = '\\\n';

interface FetchBodyOptions {
  method: string;
  body?: any;
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
export class CurlRequestModel {
  apiKeys: SecurityScheme[];
  method: string;
  parameters: FieldModel[];
  path: string;
  requestBody?: MediaContentModel;
  serverUrl: string;

  constructor({ apiKeys, method, parameters, path, requestBody, serverUrl }) {
    this.apiKeys = apiKeys;
    this.method = method;
    this.parameters = parameters;
    this.path = path.startsWith('/') ? path : `/${path}`;
    this.requestBody = requestBody;
    this.serverUrl = serverUrl;
  }

  getCurlCommand(): string {
    const fetchUrl = this.buildFetchUrl();
    const fetchHeaders = this.buildFetchHeaders();
    const fetchOptions = this.buildFetchBodyOptions();

    return this.generateCurlSyntax(fetchUrl, fetchHeaders, fetchOptions);
  }

  private buildFetchUrl() {
    let fetchUrl;
    fetchUrl = this.path;
    // Generate URL using Path Params
    this.parameters
      .filter(param => param.in === 'path' && typeof param.example !== 'undefined')
      .forEach(param => {
        fetchUrl = fetchUrl.replace(`{${param.name}}`, encodeURIComponent(param.example as string));
      });

    // Query Params
    const urlQueryParamsMap = new Map();
    const queryParameters = this.parameters.filter(param => param.in === 'query');
    if (queryParameters.length > 0) {
      queryParameters.forEach((param: FieldModel) => {
        const queryParam = new URLSearchParams();
        const value = param.example ?? param.schema.default;

        if (typeof value !== 'undefined') {
          const serializedParam = getSerializedValue(param, value);
          queryParam.append(param.name, serializedParam);
        }
        if (queryParam.toString()) {
          urlQueryParamsMap.set(param.name, queryParam);
        }
      });
    }

    let urlQueryParamString = '';
    if (urlQueryParamsMap.size) {
      urlQueryParamsMap.forEach((val, pname) => {
        urlQueryParamString += `${val.get(pname)}&`;
      });
      urlQueryParamString = urlQueryParamString.slice(0, -1);
    }
    if (urlQueryParamString.length !== 0) {
      fetchUrl = `${fetchUrl}${fetchUrl.includes('?') ? '&' : '?'}${urlQueryParamString}`;
    }

    // Add authentication Query-Param if provided
    this.apiKeys
      .filter(scheme => scheme.in === 'query')
      .forEach(scheme => {
        fetchUrl = `${fetchUrl}${fetchUrl.includes('?') ? '&' : '?'}${
          scheme.name
        }=${encodeURIComponent(scheme.displayName)}`;
      });

    fetchUrl = `${this.serverUrl.replace(/\/$/, '')}${fetchUrl}`;
    return fetchUrl;
  }

  private buildFetchHeaders() {
    const defaultAcceptHeader = 'application/json';
    const reqHeaders = new Headers();

    // Add Authentication Header if provided
    this.apiKeys
      .filter(scheme => scheme.in === 'header')
      .forEach(scheme => {
        reqHeaders.append(<string>scheme.name, scheme.displayName);
      });

    // Add Header Params
    this.parameters
      .filter(param => param.in === 'header')
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
      if (!mediaType.name.includes('form-data')) {
        // For multipart/form-data dont set the content-type to allow creation of browser generated part boundaries
        reqHeaders.append('Content-Type', mediaType.name);
      }
    }

    if (!reqHeaders.get('Accept')) {
      reqHeaders.append('Accept', defaultAcceptHeader);
    }

    return reqHeaders;
  }

  private buildFetchBodyOptions() {
    const fetchOptions: FetchBodyOptions = {
      method: this.method.toUpperCase(),
    };

    const [mediaType = {} as MediaTypeModel] = this.requestBody?.mediaTypes || [];
    const { examples, name } = mediaType;

    if (examples) {
      if (name.includes('form-urlencoded') && examples) {
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
      } else if (name.includes('form-data')) {
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
      } else if (name.includes('json') || name.includes('xml') || name.includes('text')) {
        const [{ value }] = Object.values(examples as object);

        fetchOptions.body = value;
      }
    }

    return fetchOptions;
  }

  private generateCurlSyntax(
    fetchUrl: any,
    fetchHeaders: Headers | any[],
    fetchOptions: FetchBodyOptions,
  ) {
    let curlUrl;
    let curl = '';
    let curlHeaders = '';
    let curlData = '';
    let curlForm = '';

    if (!fetchUrl.startsWith('http')) {
      const url = new URL(fetchUrl, window.location.href);
      curlUrl = url.href;
    } else {
      curlUrl = fetchUrl;
    }

    curl = `curl -X ${this.method.toUpperCase()} "${curlUrl}" ${NEW_LINE}`;

    curlHeaders = [...(fetchHeaders as any[])]
      .map(([key, value]) => ` -H "${key}: ${value}"`)
      .join(` ${NEW_LINE}`);
    if (curlHeaders) {
      curlHeaders = `${curlHeaders} ${NEW_LINE}`;
    }
    if (fetchOptions.body instanceof URLSearchParams) {
      curlData = ` -d ${fetchOptions.body.toString()} ${NEW_LINE}`;
    } else if (fetchOptions.body instanceof File) {
      curlData = ` --data-binary @${fetchOptions.body.name} ${NEW_LINE}`;
    } else if (fetchOptions.body instanceof FormData) {
      curlForm = [...(fetchOptions.body as unknown as any[])]
        .reduce((aggregator, [key, value]) => {
          if (value instanceof File) {
            return [...aggregator, ` -F "${key}=@${value.name}"`];
          }

          const multiple = value.match(/([^,],)/gm);

          if (multiple) {
            const multipleResults = multiple.map(one => `-F "${key}[]=${one}"`);

            return [...aggregator, ...multipleResults];
          }

          return [...aggregator, ` -F "${key}=${value}"`];
        }, [])
        .join(` ${NEW_LINE}`);
    } else if (fetchOptions.body) {
      if (fetchOptions.body instanceof Object) {
        try {
          curlData = ` -d '${JSON.stringify(fetchOptions.body)}' ${NEW_LINE}`;
        } catch (err) {
          // Ignore.
        }
      }
      if (!curlData) {
        curlData = ` -d '${fetchOptions.body.replace(/'/g, "'\"'\"'")}' ${NEW_LINE}`;
      }
    }

    return `${curl}${curlHeaders}${curlData}${curlForm}`;
  }
}
