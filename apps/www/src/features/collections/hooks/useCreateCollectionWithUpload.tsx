"use client";

import { useCreateCollectionMutation } from "./createCollection.generated";

export const useCreateCollectionWithUpload = () => {
  return useCreateCollectionMutation();
};
