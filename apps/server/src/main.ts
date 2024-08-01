import { Config } from "./config";
import { MediaConvertClient, S3Client } from "./aws-clients";

export async function main(env: NodeJS.ProcessEnv) {
  const config = Config.fromEnv(env);
  const s3Client = new S3Client(config.awsAccessKeyId, config.awsSecretAccessKey);
  const mediaConvertClient = new MediaConvertClient(config.awsAccessKeyId, config.awsSecretAccessKey);

  console.log("Hello World");
}
