import { Snowflake } from "discord.js";

export type stocks = 'OFFT' | 'BLY' | 'OVER';

export const startingBalance = 5000;

export const stockList: { [key in stocks]: Snowflake } = {
    "OFFT": "962936076404686859",
    "BLY": "961057412465438822",
    "OVER": "1126584442941616259",
}

export const stockEmojis: { [key in stocks]: string } = {
    "OFFT": "🗣️",
    "BLY": "🔵",
    "OVER": "🔥",
}

export interface User {
    user: Snowflake,
    balance: number,
    stocks: { [ticker: string]: number },
    lastUpdated: Date,
}

export interface Trade {
    user: Snowflake,
    ticker: string,
    amount: number,
    price: number,
    time: Date,
}

export interface Stock {
    ticker: string,
    price: number,
    volume: number,
    lastUpdated: Date,
}

export interface StockSetting {
    ticker: string,
    volumeFactor: number,
    volatilityFactor: number,
    trendFactor: number,
    limitingVolume: number,
    trend: number,
}

export interface Change {
    ticker: string,
    price: number,
    volume: number,
    volumeFactor: number,
    volatilityFactor: number,
    trendFactor: number,
    settings: StockSetting,
    time: Date,
}