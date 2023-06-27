import { PythonRequest } from '../PythonRequest';
import { FieldModel, MediaContentModel } from '../models';

describe('PythonRequest', () => {
  it('should generate a GET request', () => {
    const request = new PythonRequest({
      apiKeys: [],
      method: 'get',
      parameters: [],
      path: '/pet/1',
      requestBody: undefined,
      serverUrl: 'https://example.com',
    });

    expect(request.getSourceCode()).toMatchSnapshot();
  });

  it('should generate a GET request with parameters', () => {
    const request = new PythonRequest({
      apiKeys: [],
      method: 'get',
      parameters: [
        {
          name: 'petId',
          in: 'path',
          required: true,
          example: 123,
          schema: {
            type: 'integer',
          },
          serializationMime: 'application/json',
        },
        {
          name: 'name',
          in: 'query',
          required: true,
          example: 'Bob',
          schema: {
            type: 'string',
          },
          serializationMime: 'application/json',
        },
        {
          name: 'status',
          in: 'query',
          required: true,
          example: 'available',
          schema: {
            type: 'string',
          },
          serializationMime: 'application/json',
        },
      ] as FieldModel[],
      path: '/pet/{petId}',
      requestBody: undefined,
      serverUrl: 'https://example.com',
    });

    expect(request.getSourceCode()).toMatchSnapshot();
  });

  it('should generate a POST request with parameters', () => {
    const request = new PythonRequest({
      apiKeys: [],
      method: 'post',
      parameters: [
        {
          name: 'petId',
          in: 'path',
          required: true,
          example: 123,
          schema: {
            type: 'integer',
          },
          serializationMime: 'application/json',
        },
        {
          name: 'name',
          in: 'query',
          required: true,
          example: 'Bob',
          schema: {
            type: 'string',
          },
          serializationMime: 'application/json',
        },
        {
          name: 'status',
          in: 'query',
          required: true,
          example: 'available',
          schema: {
            type: 'string',
          },
          serializationMime: 'application/json',
        },
      ] as FieldModel[],
      path: '/pet/{petId}',
      requestBody: {
        mediaTypes: [
          {
            name: 'application/json',
            examples: {
              foo: {
                mime: 'application/json',
                value: {
                  id: '5678',
                  foo: 'bar',
                },
              },
            },
          },
        ],
      } as unknown as MediaContentModel,
      serverUrl: 'https://example.com',
    });

    expect(request.getSourceCode()).toMatchSnapshot();
  });
});
