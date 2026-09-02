"use client";

import useSWR from "swr";
import type { SuppliersResponse } from "@/app/api/app/suppliers/types";
import type { RunsResponse } from "@/app/api/app/runs/types";

export function useSuppliers() {
  const { data, isLoading, error, mutate } =
    useSWR<SuppliersResponse>("/api/app/suppliers");

  return {
    suppliers: data?.suppliers ?? [],
    isLoading,
    error,
    mutate,
  };
}

export function useRuns() {
  const { data, isLoading, error, mutate } =
    useSWR<RunsResponse>("/api/app/runs");

  return {
    runs: data?.runs ?? [],
    isLoading,
    error,
    mutate,
  };
}
