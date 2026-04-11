import express from "express";

export const app = express();

export let appPort: number;

export function setAppPort(port: number): void {
    appPort = port;
}
