import { Request, Response } from 'express';
import feeStructureService from '../services/feeStructureService';
import { asyncHandler } from '../middleware/errorHandler';
import { sendSuccess } from '../utils/responseHelper';

export const getFeeStructures = asyncHandler(
  async (req: Request, res: Response) => {
    const structures = await feeStructureService.getFeeStructures(
      req.user!.schoolId
    );

    sendSuccess(
      res,
      'Fee structures retrieved successfully',
      structures
    );
  }
);

export const createFeeStructure = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      academicYearId,
      classId,
      feeType,
      amount,
      dueDate,
      description,
    } = req.body;

    const structure = await feeStructureService.createFeeStructure({
      schoolId: req.user!.schoolId,
      academicYearId,
      classId,
      feeType,
      amount: Number(amount),
      dueDate: dueDate ? new Date(dueDate) : undefined,
      description,
    });

    sendSuccess(
      res,
      'Fee structure created successfully',
      structure,
      201
    );
  }
);

export const updateFeeStructure = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const structure = await feeStructureService.updateFeeStructure(
      id,
      req.user!.schoolId,
      {
        feeType: req.body.feeType,
        amount:
          req.body.amount !== undefined
            ? Number(req.body.amount)
            : undefined,
        dueDate:
          req.body.dueDate !== undefined
            ? req.body.dueDate
              ? new Date(req.body.dueDate)
              : null
            : undefined,
        description: req.body.description,
        isActive: req.body.isActive,
      }
    );

    sendSuccess(
      res,
      'Fee structure updated successfully',
      structure
    );
  }
);

export const deleteFeeStructure = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    await feeStructureService.deleteFeeStructure(
      id,
      req.user!.schoolId
    );

    sendSuccess(
      res,
      'Fee structure deleted successfully',
      null
    );
  }
);