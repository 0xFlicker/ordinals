"use client";

import { useSignMultipartUploadLazyQuery } from "./signMultipartUpload.generated";

export function useSignMultipartUpload() {
  return useSignMultipartUploadLazyQuery();
}
