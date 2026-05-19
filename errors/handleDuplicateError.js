const handleDuplicateError = (err) => {
  const key = Object.keys(err?.keyPattern || err?.keyValue || {})[0];
  const fieldLabel =
    {
      email: "Email",
      phoneNumber: "Phone number",
    }[key] || "Value";
  const message = `${fieldLabel} already exists`;

  const errorSources = [
    {
      path: key || "",
      message,
    },
  ];

  const statusCode = 400;

  return {
    statusCode,
    message,
    errorSources,
  };
};

export default handleDuplicateError;
