import { Router } from 'express';
import type { DbClient } from '@heartwood/database';
import {
  assetInputSchema,
  assetSearchSchema,
  assetUpdateSchema,
  beneficiaryInputSchema,
  beneficiaryUpdateSchema,
  directorySearchSchema,
  draftDocumentParamSchema,
  draftFileName,
  type DraftDocumentKey,
  executorInputSchema,
  executorUpdateSchema,
  replaceAllocationsSchema,
  reportQuerySchema,
  replaceResiduarySchema,
} from '@heartwood/shared';
import { getDraftWill } from '../modules/draft-will/draft-will.service';
import { renderDraftDocx } from '../modules/draft-will/draft-will.docx';
import { renderDraftPdf } from '../modules/draft-will/draft-will.pdf';
import { createAuthenticate, requireAccountId } from '../middleware/authenticate';
import { parseBody } from '../middleware/validate';
import { getResiduary } from '../modules/allocation/allocation.service';
import {
  createAsset,
  deleteAsset,
  getAsset,
  searchAssets,
  updateAsset,
} from '../modules/asset/asset.service';
import {
  createBeneficiary,
  deleteBeneficiary,
  getBeneficiary,
  listBeneficiaries,
  updateBeneficiary,
} from '../modules/beneficiary/beneficiary.service';
import {
  createExecutor,
  deleteExecutor,
  listExecutors,
  updateExecutor,
} from '../modules/executor/executor.service';
import {
  getAssetAllocations,
  getInventoryReport,
  replaceAssetAllocations,
  replaceResiduary,
} from '../modules/inventory/inventory.service';
import {
  listOrganizationStates,
  searchOrganizations,
} from '../modules/organization-directory/organization-directory.service';
import { idParam } from '../utils/params';
import { created, noContent, ok } from '../utils/response';

const attachment = (document: DraftDocumentKey, personName: string, format: 'pdf' | 'docx') =>
  `attachment; filename="${draftFileName(document, personName, format)}"`;

/** Everything a testator keeps: every route is behind `authenticate` and scoped to the caller. */
export function createInventoryRoutes(db: DbClient, authSecret: string) {
  const router = Router();
  router.use(createAuthenticate(authSecret));

  router.get('/assets', async (req, res) =>
    ok(res, await searchAssets(db, requireAccountId(req), parseBody(assetSearchSchema, req.query)))
  );
  router.post('/assets', async (req, res) =>
    created(
      res,
      await createAsset(db, requireAccountId(req), parseBody(assetInputSchema, req.body))
    )
  );
  router.get('/assets/:id', async (req, res) =>
    ok(res, await getAsset(db, requireAccountId(req), idParam(req)))
  );
  router.patch('/assets/:id', async (req, res) =>
    ok(
      res,
      await updateAsset(
        db,
        requireAccountId(req),
        idParam(req),
        parseBody(assetUpdateSchema, req.body)
      )
    )
  );
  router.delete('/assets/:id', async (req, res) => {
    await deleteAsset(db, requireAccountId(req), idParam(req));
    noContent(res);
  });

  router.get('/assets/:id/allocations', async (req, res) =>
    ok(res, await getAssetAllocations(db, requireAccountId(req), idParam(req)))
  );
  router.put('/assets/:id/allocations', async (req, res) =>
    ok(
      res,
      await replaceAssetAllocations(
        db,
        requireAccountId(req),
        idParam(req),
        parseBody(replaceAllocationsSchema, req.body).entries
      )
    )
  );

  router.get('/beneficiaries', async (req, res) =>
    ok(res, await listBeneficiaries(db, requireAccountId(req)))
  );
  router.post('/beneficiaries', async (req, res) =>
    created(
      res,
      await createBeneficiary(
        db,
        requireAccountId(req),
        parseBody(beneficiaryInputSchema, req.body)
      )
    )
  );
  router.get('/beneficiaries/:id', async (req, res) =>
    ok(res, await getBeneficiary(db, requireAccountId(req), idParam(req)))
  );
  router.patch('/beneficiaries/:id', async (req, res) =>
    ok(
      res,
      await updateBeneficiary(
        db,
        requireAccountId(req),
        idParam(req),
        parseBody(beneficiaryUpdateSchema, req.body)
      )
    )
  );
  router.delete('/beneficiaries/:id', async (req, res) => {
    await deleteBeneficiary(db, requireAccountId(req), idParam(req));
    noContent(res);
  });

  router.get('/residuary', async (req, res) =>
    ok(res, await getResiduary(db, requireAccountId(req)))
  );
  router.put('/residuary', async (req, res) =>
    ok(
      res,
      await replaceResiduary(
        db,
        requireAccountId(req),
        parseBody(replaceResiduarySchema, req.body).entries
      )
    )
  );

  router.get('/executors', async (req, res) =>
    ok(res, await listExecutors(db, requireAccountId(req)))
  );
  router.post('/executors', async (req, res) =>
    created(
      res,
      await createExecutor(db, requireAccountId(req), parseBody(executorInputSchema, req.body))
    )
  );
  router.patch('/executors/:id', async (req, res) =>
    ok(
      res,
      await updateExecutor(
        db,
        requireAccountId(req),
        idParam(req),
        parseBody(executorUpdateSchema, req.body)
      )
    )
  );
  router.delete('/executors/:id', async (req, res) => {
    await deleteExecutor(db, requireAccountId(req), idParam(req));
    noContent(res);
  });

  router.get('/organization-directory', async (req, res) =>
    ok(res, await searchOrganizations(db, parseBody(directorySearchSchema, req.query)))
  );
  router.get('/organization-directory/states', async (_req, res) =>
    ok(res, await listOrganizationStates(db))
  );

  router.get('/draft-will', async (req, res) =>
    ok(res, await getDraftWill(db, requireAccountId(req)))
  );
  // The two documents of the draft, each as a PDF (to read and print) or a Word file (to edit).
  router.get('/draft-will/:document.pdf', async (req, res) => {
    const { document } = parseBody(draftDocumentParamSchema, req.params);
    const draft = await getDraftWill(db, requireAccountId(req));
    const file = await renderDraftPdf(draft[document], document, {
      reference: draft.reference,
      preparedAt: draft.preparedAt,
    });
    res
      .status(200)
      .set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': attachment(document, draft.testatorName, 'pdf'),
      })
      .send(file);
  });
  router.get('/draft-will/:document.docx', async (req, res) => {
    const { document } = parseBody(draftDocumentParamSchema, req.params);
    const draft = await getDraftWill(db, requireAccountId(req));
    const file = await renderDraftDocx(draft[document], document, {
      reference: draft.reference,
      preparedAt: draft.preparedAt,
    });
    res
      .status(200)
      .set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': attachment(document, draft.testatorName, 'docx'),
      })
      .send(file);
  });

  router.get('/inventory/report', async (req, res) =>
    ok(
      res,
      await getInventoryReport(db, requireAccountId(req), parseBody(reportQuerySchema, req.query))
    )
  );

  return router;
}
