declare module 'express' {
  import { Express } from 'express-serve-static-core';
  
  function express(): Express;
  namespace express {
    function static(path: string): any;
  }
  
  export default express;
  export * from 'express-serve-static-core';
}

declare module 'cors' {
  import { RequestHandler } from 'express';
  function cors(): RequestHandler;
  export default cors;
}

declare module 'body-parser' {
  import { RequestHandler } from 'express';
  namespace bodyParser {
    function json(): RequestHandler;
    function urlencoded(options: { extended: boolean }): RequestHandler;
  }
  export default bodyParser;
} 
 