import { ReactNode } from "react";

export interface ILayout {
    children: ReactNode;
    params: Record<string, string>
}