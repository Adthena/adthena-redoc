import {
  FetchBodyOptions,
  FetchUrlOptions,
  RequestGenerator,
  RequestGeneratorOptions,
} from './RequestGenerator';
import { groupParamsByKey } from '../utils';

const NEW_LINE = '\n';

export class PythonRequest extends RequestGenerator {
  constructor(options: RequestGeneratorOptions) {
    super(options);
  }

  getSourceCode(): string {
    const fetchUrl: FetchUrlOptions = this.buildFetchUrl();
    const fetchHeaders: Headers = this.buildFetchHeaders();
    const fetchOptions: FetchBodyOptions = this.buildFetchBodyOptions();

    return this.generatePythonSyntax(fetchUrl, fetchHeaders, fetchOptions);
  }

  private generatePythonSyntax(
    fetchUrl: FetchUrlOptions,
    fetchHeaders: Headers,
    fetchOptions: FetchBodyOptions,
  ) {
    const imports = `import requests${NEW_LINE}${NEW_LINE}`;
    let pythonUrlLine = 'url =';
    let pythonResponseLine = 'response = requests.request(';
    let pythonHeaders = '';
    let pythonData = '';
    let pythonQueryParams = '';
    let pythonCookies = '';

    if (!fetchUrl.fetchUrl.startsWith('http')) {
      const url = new URL(fetchUrl.fetchUrl, window.location.href);
      pythonUrlLine = `${pythonUrlLine} "${url.href}"`;
    } else {
      pythonUrlLine = `${pythonUrlLine} "${fetchUrl.fetchUrl}"`;
    }

    if (pythonUrlLine) {
      pythonUrlLine = `${pythonUrlLine}${NEW_LINE}${NEW_LINE}`;
    }

    pythonHeaders = JSON.stringify(
      groupParamsByKey(fetchHeaders.entries() as IterableIterator<[string, string]>),
      undefined,
      2,
    );

    if (pythonHeaders && pythonHeaders != '{}') {
      pythonHeaders = `headers = ${pythonHeaders}${NEW_LINE}${NEW_LINE}`;
    }

    if (fetchUrl.queryParams?.toString()) {
      pythonQueryParams = JSON.stringify(
        groupParamsByKey(fetchUrl.queryParams.entries()),
        undefined,
        2,
      );
      pythonQueryParams = `params = ${pythonQueryParams}${NEW_LINE}${NEW_LINE}`;
    }

    if (fetchOptions.body instanceof URLSearchParams) {
      pythonData = `payload = ${fetchOptions.body.toString()} ${NEW_LINE}`;
    } else if (fetchOptions.body) {
      if (fetchOptions.body instanceof Object) {
        try {
          pythonData = `payload = ${JSON.stringify(fetchOptions.body, undefined, 2)}`;
        } catch (err) {
          // Ignore.
        }
      }
      if (!pythonData) {
        pythonData = `payload = '${fetchOptions.body.replace(/'/g, "'\"'\"'")}'${NEW_LINE}`;
      }
    }

    if (pythonData) {
      pythonData = `${pythonData}${NEW_LINE}${NEW_LINE}`;
    }

    if (fetchUrl.cookieParams?.toString()) {
      pythonCookies = `cookies = ${JSON.stringify(
        groupParamsByKey(fetchUrl.cookieParams?.entries()),
        undefined,
        2,
      )}${NEW_LINE}${NEW_LINE}`;
    }

    const params = [
      `"${this.method.toUpperCase()}"`,
      'url',
      pythonData ? 'data=payload' : '',
      pythonHeaders ? 'headers=headers' : '',
      pythonQueryParams ? 'params=params' : '',
      pythonCookies ? 'cookies=cookies' : '',
    ];
    pythonResponseLine += `${params.filter(Boolean).join(', ')})${NEW_LINE}${NEW_LINE}`;

    let logging = `print(response.status_code)${NEW_LINE}`;
    logging += this.getResponseLogging(fetchHeaders.get('accept') || '');

    return [
      imports,
      pythonUrlLine,
      pythonHeaders,
      pythonQueryParams,
      pythonCookies,
      pythonData,
      pythonResponseLine,
      logging,
    ].join('');
  }

  private getResponseLogging(acceptHeader: string) {
    switch (acceptHeader) {
      case 'application/json':
        return 'print(response.json())';
      case 'application/octet-stream':
        return 'print(response.content)';
      case 'application/x-www-form-urlencoded':
      default:
        return 'print(response.text)';
    }
  }
}
