import {ErrorRequestHandler} from "./RequestHandler";
import {logger} from "firebase-functions";

export const errorRequestHandler:ErrorRequestHandler = (err, req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  logger.error('Request failed', err);

  res.status(err.status || 500);
  res.json({
    name: err.name,
    message: err.message,
  });
}