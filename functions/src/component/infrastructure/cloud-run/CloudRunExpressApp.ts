import {Endpoint} from "../express/Endpoint";
import {endpointBuilder} from "../express/EndpointBuilder";
import {logger} from "firebase-functions";
import {uuid} from "../../external-lib/Uuid";



const listen = async (port:number, endpointSupplier:() => Promise<Array<Endpoint>>) => {
  const serverStart = new Date()
  const instanceId = uuid()
  const endpoints = await endpointSupplier()
  const app = endpointBuilder.buildApp(endpoints, {
    preMiddleware: [
      (req, resp, next) => {
        const reqStart = new Date()
        logger.info(`${reqStart.toISOString()} - ${instanceId} - ${req.method} ${req.originalUrl}`)
        resp.on('finish', () => {
          logger.info(`${new Date().toISOString()} - ${instanceId} - ${req.method} ${req.originalUrl} - ${resp.statusCode} - ${new Date().getTime() - reqStart.getTime()}ms`)
        })
        next()
      },
    ],
  })

  const server = app.listen(port, () => {
    logger.log(`listening on port ${port}, server startup took: ${new Date().getTime() - serverStart.getTime()}ms`);
  });

  return server
}

export const cloudRunExpressApp = {
  listen,
}