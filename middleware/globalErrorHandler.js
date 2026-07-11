import handleValidationError from "../errors/handleValidationError.js";
import HandleCastError from "../errors/HandleCastError.js";
import handleDuplicateError from "../errors/handleDuplicateError.js";
import AppError from "./../errors/AppError.js";

const isProductionRuntime = () =>
  process.env.NODE_ENV === "production" || Boolean(process.env.RENDER);

const globalErrorHandler = (err, req, res, next) => {
  const production = isProductionRuntime();
  if (!production) {
    console.error({ GlobalError: err });
  }

  let statusCode = 500;
  let message = err.message;
  let errorSources = [
    {
      path: "",
      message: err.message,
    },
  ];

  if (err?.name === "ValidationError") {
    const simplifiedError = handleValidationError(err);
    statusCode = simplifiedError?.statusCode;
    message = simplifiedError?.message;
    errorSources = simplifiedError?.errorSources;
  } else if (err?.name === "CastError") {
    const simplifiedError = HandleCastError(err);
    statusCode = simplifiedError?.statusCode;
    message = simplifiedError?.message;
    errorSources = simplifiedError?.errorSources;
  } else if (err?.code === 11000) {
    const simplifiedError = handleDuplicateError(err);
    statusCode = simplifiedError?.statusCode;
    message = simplifiedError?.message;
    errorSources = simplifiedError?.errorSources;
  } else if (err instanceof AppError) {
    statusCode = err?.statusCode;
    message = err.message;
    errorSources = [
      {
        path: "",
        message: err?.message,
      },
    ];
  } else if (err?.name === "MulterError") {
    statusCode = 400;
    message = err.code === "LIMIT_FILE_SIZE" ? "Uploaded file is too large" : err.message;
    errorSources = [
      {
        path: err.field || "file",
        message,
      },
    ];
  } else if (err?.statusCode) {
    statusCode = err.statusCode;
    message = err.message;
    errorSources = [
      {
        path: "",
        message,
      },
    ];
  }

  const response = {
    success: false,
    message,
    errorSources,
  };

  if (!production) {
    response.err = err;
    response.stack = err?.stack || null;
  }

  return res.status(statusCode).json(response);
};

export default globalErrorHandler;
