import {Endpoint, Method} from "../../infrastructure/express/Endpoint";
import {BASIC_AUTH} from "../../infrastructure/Authorization";
import {setInfoSourcer} from "./SetInfoSourcer";


export const SourceSet:Endpoint = {
  path: '/:setCode',
  method: Method.GET,
  auth: BASIC_AUTH,
  requestHandler: async (req, res, next) => {
    const setCode = req.params['setCode'];
    return setInfoSourcer.source(setCode);
  },
}