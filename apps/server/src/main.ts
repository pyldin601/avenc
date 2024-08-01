async function main(env: NodeJS.ProcessEnv) {
  console.log("Hello World", env);
}

main(process.env).catch((error) => {
  console.error(error);
  process.exit(1);
});
