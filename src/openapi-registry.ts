import { OperationObject } from 'openapi3-ts';
import { ZodVoid } from 'zod';
import { ZodObject } from 'zod';
import { ZodSchema, ZodType } from 'zod';

type Method = 'get' | 'post' | 'put' | 'delete' | 'patch';

export type ResponseConfig =
  | { mediaType: string; schema: ZodType<unknown> }
  | ZodVoid;

export interface RouteConfig extends OperationObject {
  method: Method;
  path: string;
  request?: {
    body?: ZodType<unknown>;
    params?: ZodObject<any>;
    query?: ZodObject<any>;
    headers?: ZodType<unknown>[];
  };
  responses: {
    [statusCode: string]: ResponseConfig;
  };
}

export type OpenAPIDefinitions =
  | { type: 'schema'; schema: ZodSchema<any> }
  | { type: 'parameter'; schema: ZodSchema<any> }
  | { type: 'route'; route: RouteConfig };

export class OpenAPIRegistry {
  private _definitions: OpenAPIDefinitions[] = [];

  constructor(private parents?: OpenAPIRegistry[]) {}

  get definitions(): OpenAPIDefinitions[] {
    const parentDefinitions =
      this.parents?.flatMap((par) => par.definitions) ?? [];

    return [...parentDefinitions, ...this._definitions];
  }

  /**
   * Registers a new component schema under /components/schemas/${name}
   */
  register<T extends ZodSchema<any>>(refId: string, zodSchema: T) {
    const currentMetadata = zodSchema._def.openapi;
    const schemaWithMetadata = zodSchema.openapi({
      ...currentMetadata,
      refId,
    });

    this._definitions.push({ type: 'schema', schema: schemaWithMetadata });

    return schemaWithMetadata;
  }

  /**
   * Registers a new parameter schema under /components/parameters/${name}
   */
  registerParameter<T extends ZodSchema<any>>(refId: string, zodSchema: T) {
    const currentMetadata = zodSchema._def.openapi;

    const schemaWithMetadata = zodSchema.openapi({
      ...currentMetadata,
      param: {
        ...currentMetadata?.param,
        name: currentMetadata?.param?.name ?? refId,
      },
      refId,
    });

    this._definitions.push({
      type: 'parameter',
      schema: schemaWithMetadata,
    });

    return schemaWithMetadata;
  }

  /**
   * Registers a new path that would be generated under paths:
   */
  registerPath(route: RouteConfig) {
    this._definitions.push({
      type: 'route',
      route,
    });
  }
}
