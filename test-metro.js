try {
  console.log("Loading metro config...");
  const config = require("./metro.config.js");
  console.log("Config loaded successfully");
  console.log("Type of config:", typeof config);
  console.log("Is array:", Array.isArray(config));
  if (config && config.resolver) {
    console.log(
      "Has resolver.resolveRequest:",
      !!config.resolver.resolveRequest,
    );
  }
} catch (error) {
  console.error("Error loading config:", error.message);
  console.error(error.stack);
}
