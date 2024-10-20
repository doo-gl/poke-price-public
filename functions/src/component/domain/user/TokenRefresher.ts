import axios from "axios";
import {configRetriever} from "../../infrastructure/ConfigRetriever";
import {RefreshTokenBody} from "./UserEndpoints";
import {TokenDto} from "./UserDto";
import {logger} from "firebase-functions";


const refresh = async (request:RefreshTokenBody):Promise<TokenDto> => {
  const apiKey = configRetriever.retrieve().firebaseApiKey();
  try {
    const response = await axios.post(
      `https://securetoken.googleapis.com/v1/token?key=${apiKey}`,
      `grant_type=refresh_token&refresh_token=${request.refreshToken}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    return {
      accessToken: response.data.id_token,
      refreshToken: response.data.refresh_token,
    }
  } catch (err:any) {
    if (err.isAxiosError && err.response && err.response.data) {
      logger.error(`Failed to refresh token: ${err.response.status} - ${JSON.stringify(err.response.data)} - ${JSON.stringify(err.response.headers)}`);
    } else {
      logger.error(`Failed to refresh token`, err);
    }
    throw err;
  }
}

export const tokenRefresher = {
  refresh,
}