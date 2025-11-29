declare module "express" {
  export interface Request {
    body?: unknown;
    params: Record<string, string>;
    query: Record<string, string | string[]>;
    headers: Record<string, string | string[] | undefined>;
  }

  export interface Response {
    status: (code: number) => Response;
    json: (body?: unknown) => Response;
    send: (body?: unknown) => Response;
  }

  export interface NextFunction {
    (error?: unknown): void;
  }

  export type RequestHandler = (req: Request, res: Response, next: NextFunction) => unknown;

  export type Router = RequestHandler & {
    use: {
      (handler: RequestHandler, ...handlers: RequestHandler[]): Router;
      (path: string, handler: RequestHandler, ...handlers: RequestHandler[]): Router;
    };
    get: (path: string, handler: RequestHandler, ...handlers: RequestHandler[]) => Router;
    post: (path: string, handler: RequestHandler, ...handlers: RequestHandler[]) => Router;
  };

  export interface ExpressInstance extends Router {
    listen: (port: number, callback?: () => void) => void;
  }

  export interface ExpressStatic {
    (): ExpressInstance;
    Router: () => Router;
    json: (options?: { limit?: string | number }) => RequestHandler;
    urlencoded: (options?: { extended?: boolean; limit?: string | number }) => RequestHandler;
  }

  const express: ExpressStatic;

  export default express;
  export const Router: ExpressStatic["Router"];
  export const json: ExpressStatic["json"];
  export const urlencoded: ExpressStatic["urlencoded"];
  export { Request, Response, RequestHandler };
}

declare module "cors" {
  type CorsMiddleware = (...args: any[]) => any;
  export default function cors(options?: Record<string, unknown>): CorsMiddleware;
}
