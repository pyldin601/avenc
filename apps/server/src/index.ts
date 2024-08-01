import { main } from "./main";

main(process.env).catch((error) => {
  console.error(error);
  process.exit(1);
});
