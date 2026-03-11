"use client";

import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

import { openApiSpec } from "@/lib/swagger/openapi";

export default function ApiDocsPage() {
  return (
    <div style={{ padding: "1rem" }}>
      <SwaggerUI spec={openApiSpec} />
    </div>
  );
}
