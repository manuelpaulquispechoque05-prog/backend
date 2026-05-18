import express from 'express';
import {
  getAll,
  getById,
  create,
  update,
  deleteRe
} from '../controllers/reporte.controller.js';

const router = express.Router();

router.get('/', getAll);
router.get('/:id', getById);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', deleteRe);

export default router;