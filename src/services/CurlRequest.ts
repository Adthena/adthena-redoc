import {
  FetchBodyOptions,
  FetchUrlOptions,
  RequestGenerator,
  RequestGeneratorOptions,
} from './RequestGenerator';

const NEW_LINE = '\\\n';

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
export class CurlRequest extends RequestGenerator {
  constructor(options: RequestGeneratorOptions) {
    super(options);
  }

  getSourceCode(): string {
    const fetchUrl: FetchUrlOptions = this.buildFetchUrl();
    const fetchHeaders: Headers = this.buildFetchHeaders();
    const fetchOptions: FetchBodyOptions = this.buildFetchBodyOptions();

    return this.generateCurlSyntax(fetchUrl, fetchHeaders, fetchOptions);
  }
  private generateCurlSyntax(
    fetchUrl: FetchUrlOptions,
    fetchHeaders: Headers,
    fetchOptions: FetchBodyOptions,
  ) {
    let curlUrl;
    let curlHeaders: string;
    let curlData = '';
    let curlForm = '';
    let cookies = '';

    if (!fetchUrl.fullUrl.startsWith('http')) {
      const url = new URL(fetchUrl.fullUrl, window.location.href);
      curlUrl = url.href;
    } else {
      curlUrl = fetchUrl.fullUrl;
    }

    const curlCommand = `curl -i -X ${this.method.toUpperCase()} "${curlUrl}" ${NEW_LINE}`;

    curlHeaders = [...fetchHeaders]
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

    if (fetchUrl.cookieParams?.toString()) {
      cookies = ` -c "${fetchUrl.cookieParams.toString()}" ${NEW_LINE}`;
    }

    return [curlCommand, curlHeaders, cookies, curlData, curlForm].join('');
  }
}
