/*
track production
raw material → product flow
--> domain-specific logic
*/
import type { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/db.js";
import { completeBatch, startBatch } from "../services/wipService.js";

export const startBatchHandler = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const batch = await startBatch(req.body);
        res.status(201).json(batch);
    } catch (error) {
        next(error);
    }
};

export const completeBatchHandler = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { batch_number } = req.params;
        if(typeof batch_number === "string") {
            const batch = await completeBatch(batch_number);
            res.json(batch);
        }
    } catch (error) {
        next(error);
    }
};

export const getAllBatchesHandler = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const batches = await prisma.manufacturing.findMany({
            orderBy: {
                start_date: "desc"
            }
        });
        res.json(batches);

    } catch (error) {
        next(error);
    }
};

export const getBatchByHandler = async (
    req: Request,
    res: Response,
    next: NextFunction
)=> {
    try{
        const {batch_number} = req.params;
        let batch;
        if(typeof batch_number === "string") {
                batch = await prisma.manufacturing.findUnique({
                where:{batch_number}
            });
        }
        if(!batch){
            res.status(404).json({error:"No batch found"});
            return;
        }
        res.json(batch);
    }
    catch(error){
        next(error);
    }
};



