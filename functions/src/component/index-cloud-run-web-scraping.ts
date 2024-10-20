import {cloudRunExpressApp} from "./infrastructure/cloud-run/CloudRunExpressApp";
import {logger} from "firebase-functions";


const port = parseInt(process.env.PORT ?? "8080") || 8080;
cloudRunExpressApp.listen(
  port,
  async () => [(await import('./domain/scraping/FetchUrlEndpoints')).FetchUrlBasic]
)
  .then((server) => {
    logger.info("Listening")
  })
  .catch((err:any) => {
    logger.error(`Failed to start, ${err.message}`, err)
  })