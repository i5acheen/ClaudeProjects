"use client";

import { createContext, useContext } from "react";
import { SCREEN_FORMAT, type PageFormat } from "@/lib/page-format";

const PageFormatContext = createContext<PageFormat>(SCREEN_FORMAT);

export const PageFormatProvider = PageFormatContext.Provider;
export const usePageFormat = () => useContext(PageFormatContext);
