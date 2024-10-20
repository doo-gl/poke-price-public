import sharp from "sharp";
import {File} from "@google-cloud/storage";

export interface ImageDetails {
  format:string,
  size:number,
  width:number,
  height:number,
  url:string,
}

const mapDetails = (info:sharp.OutputInfo, file:File):ImageDetails => {
  return {
    format: info.format,
    size: info.size,
    height: info.height,
    width: info.width,
    url: file.publicUrl(),
  }
}

const convertToWebp = (inputBuffer:Buffer, width?:number):Promise<{data: Buffer, info: sharp.OutputInfo}> => {
  let result = sharp(inputBuffer);
  if (width) {
    result = result.resize({ width })
  }
  return result
    .webp()
    .withMetadata()
    .toBuffer({resolveWithObject: true})
}

const convertToJpg = (inputBuffer:Buffer, width?:number):Promise<{data: Buffer, info: sharp.OutputInfo}> => {
  let result = sharp(inputBuffer);
  if (width) {
    result = result.resize({ width })
  }
  return result
    .jpeg({
      progressive: true,
      quality: 80,
      optimiseScans: true,
    })
    .withMetadata()
    .toBuffer({resolveWithObject: true})
}

const convertToPng = (inputBuffer:Buffer, width?:number):Promise<{data: Buffer, info: sharp.OutputInfo}> => {
  let result = sharp(inputBuffer);
  if (width) {
    result = result.resize({ width })
  }
  return result
    .png({
      adaptiveFiltering: true,
      progressive: true,
      quality: 80,
      compressionLevel: 9,
    })
    .withMetadata()
    .toBuffer({resolveWithObject: true})
}

const optimizeToWebp = async (rawImage:Buffer, file:File, width?:number):Promise<ImageDetails> => {
  const optimisedImage = await convertToWebp(rawImage, width);
  await file.save(optimisedImage.data, { public: true, predefinedAcl: "publicRead" })
  return mapDetails(optimisedImage.info, file)
}

const optimizeToJpg = async (rawImage:Buffer, file:File, width?:number):Promise<ImageDetails> => {
  const optimisedImage = await convertToJpg(rawImage, width);
  await file.save(optimisedImage.data, { public: true, predefinedAcl: "publicRead" })
  return mapDetails(optimisedImage.info, file)
}

const optimizeToPng = async (rawImage:Buffer, file:File, width?:number):Promise<ImageDetails> => {
  const optimisedImage = await convertToPng(rawImage, width);
  await file.save(optimisedImage.data, { public: true, predefinedAcl: "publicRead" })
  return mapDetails(optimisedImage.info, file)
}

export const imageOptimizer = {
  optimizeToWebp,
  optimizeToJpg,
  optimizeToPng,
}