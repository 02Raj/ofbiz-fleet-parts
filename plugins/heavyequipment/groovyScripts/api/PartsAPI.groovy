import groovy.json.JsonBuilder
import org.apache.ofbiz.entity.GenericValue
import org.apache.ofbiz.entity.util.EntityQuery
import org.apache.ofbiz.entity.condition.EntityCondition
import org.apache.ofbiz.entity.condition.EntityOperator
import org.apache.ofbiz.service.ServiceUtil

response.setContentType("application/json")
def out = response.getWriter()

try {
    def userLogin = request.getSession().getAttribute("userLogin") ?: EntityQuery.use(delegator).from("UserLogin").where("userLoginId", "system").queryOne()
    String action = request.getParameter("action")

    // ======================== LIST ========================
    if (action == "list") {
        String categoryId = request.getParameter("categoryId")
        String status = request.getParameter("status")
        String searchTerm = request.getParameter("search")
        int page = (request.getParameter("page") ?: "1") as int
        int pageSize = (request.getParameter("pageSize") ?: "50") as int
        int offset = (page - 1) * pageSize

        // Build conditions
        List<EntityCondition> conditions = []
        conditions.add(EntityCondition.makeCondition("productTypeId", EntityOperator.EQUALS, "FINISHED_GOOD"))

        if (status) {
            if (status == "DISCONTINUED") {
                conditions.add(EntityCondition.makeCondition("salesDiscontinuationDate", EntityOperator.NOT_EQUAL, null))
            } else if (status == "ACTIVE") {
                conditions.add(EntityCondition.makeCondition("salesDiscontinuationDate", EntityOperator.EQUALS, null))
            }
        }

        if (searchTerm) {
            List<EntityCondition> searchOr = []
            searchOr.add(EntityCondition.makeCondition("productId", EntityOperator.LIKE, "%" + searchTerm + "%"))
            searchOr.add(EntityCondition.makeCondition("internalName", EntityOperator.LIKE, "%" + searchTerm + "%"))
            searchOr.add(EntityCondition.makeCondition("productName", EntityOperator.LIKE, "%" + searchTerm + "%"))
            searchOr.add(EntityCondition.makeCondition("description", EntityOperator.LIKE, "%" + searchTerm + "%"))
            searchOr.add(EntityCondition.makeCondition("brandName", EntityOperator.LIKE, "%" + searchTerm + "%"))
            conditions.add(EntityCondition.makeCondition(searchOr, EntityOperator.OR))
        }

        def mainCondition = EntityCondition.makeCondition(conditions, EntityOperator.AND)

        // Get total count
        def allProducts = EntityQuery.use(delegator).from("Product").where(mainCondition).queryList()
        int totalCount = allProducts.size()

        // Get paginated results
        def products = EntityQuery.use(delegator)
            .from("Product")
            .where(mainCondition)
            .orderBy("productName")
            .maxRows(pageSize)
            .queryList()

        // If offset, skip records
        if (offset > 0 && offset < products.size()) {
            products = products.subList(offset, Math.min(offset + pageSize, products.size()))
        } else if (offset >= products.size()) {
            products = []
        } else {
            products = products.subList(0, Math.min(pageSize, products.size()))
        }

        def resultList = products.collect { prod ->
            // Get cross-references count
            def xrefCount = EntityQuery.use(delegator).from("PartCrossReference").where("productId", prod.productId).queryCount()

            // Get compatibility count
            def compatCount = EntityQuery.use(delegator).from("PartEquipmentCompatibility").where("productId", prod.productId).queryCount()

            [
                productId: prod.productId,
                productName: prod.productName,
                internalName: prod.internalName,
                description: prod.description,
                brandName: prod.brandName,
                productWeight: prod.productWeight,
                quantityUomId: prod.quantityUomId,
                statusId: prod.salesDiscontinuationDate ? "DISCONTINUED" : "ACTIVE",
                crossRefCount: xrefCount,
                compatCount: compatCount
            ]
        }

        out.print(new JsonBuilder([
            parts: resultList,
            pagination: [
                page: page,
                pageSize: pageSize,
                totalCount: totalCount,
                totalPages: Math.ceil(totalCount / pageSize) as int
            ]
        ]).toString())
        return "success"
    }
    // ======================== CREATE ========================
    else if (action == "create") {
        String productName = request.getParameter("productName")
        String internalName = request.getParameter("internalName") // SKU
        String description = request.getParameter("description")
        String brandName = request.getParameter("brandName")
        String quantityUomId = request.getParameter("quantityUomId") ?: "WT_ea"
        String productWeight = request.getParameter("productWeight")
        String oemPartNumber = request.getParameter("oemPartNumber")
        String categoryId = request.getParameter("categoryId")

        if (!productName) {
            response.setStatus(400)
            out.print(new JsonBuilder([error: "Missing productName parameter"]).toString())
            return "error"
        }

        // Create Product via OFBiz service
        def createCtx = [
            productTypeId: "FINISHED_GOOD",
            productName: productName,
            internalName: internalName ?: productName,
            description: description,
            brandName: brandName,
            quantityUomId: quantityUomId,
            isVirtual: "N",
            isVariant: "N",
            userLogin: userLogin
        ]

        if (productWeight) {
            createCtx.productWeight = new BigDecimal(productWeight)
        }

        def result = dispatcher.runSync("createProduct", createCtx)
        if (ServiceUtil.isError(result)) {
            throw new Exception(ServiceUtil.getErrorMessage(result))
        }

        String productId = result.productId

        // If OEM part number provided, create cross-reference
        if (oemPartNumber) {
            String xrefId = delegator.getNextSeqId("PartCrossReference")
            delegator.create("PartCrossReference", [
                crossRefId: xrefId,
                productId: productId,
                crossRefType: "OEM",
                crossRefPartNumber: oemPartNumber,
                crossRefBrand: brandName ?: "",
                fromDate: new java.sql.Timestamp(System.currentTimeMillis())
            ])
        }

        // If category provided, create ProductCategoryMember
        if (categoryId) {
            try {
                delegator.create("ProductCategoryMember", [
                    productId: productId,
                    productCategoryId: categoryId,
                    fromDate: new java.sql.Timestamp(System.currentTimeMillis())
                ])
            } catch (Exception catEx) {
                // Category might not exist, continue anyway
            }
        }

        out.print(new JsonBuilder([
            success: true,
            productId: productId,
            productName: productName,
            internalName: internalName
        ]).toString())
        return "success"
    }
    // ======================== GET (Single Part) ========================
    else if (action == "get") {
        String productId = request.getParameter("productId")
        if (!productId) {
            response.setStatus(400)
            out.print(new JsonBuilder([error: "Missing productId parameter"]).toString())
            return "error"
        }

        def product = EntityQuery.use(delegator).from("Product").where("productId", productId).queryOne()
        if (!product) {
            response.setStatus(404)
            out.print(new JsonBuilder([error: "Part not found: " + productId]).toString())
            return "error"
        }

        // Get cross-references
        def xrefs = EntityQuery.use(delegator).from("PartCrossReference").where("productId", productId).queryList()
        def xrefList = xrefs.collect { [
            crossRefId: it.crossRefId,
            crossRefType: it.crossRefType,
            crossRefPartNumber: it.crossRefPartNumber,
            crossRefBrand: it.crossRefBrand,
            crossRefProductId: it.crossRefProductId,
            notes: it.notes
        ] }

        // Get equipment compatibility
        def compats = EntityQuery.use(delegator).from("PartEquipmentCompatibility").where("productId", productId).queryList()
        def compatList = compats.collect { compat ->
            def asset = EntityQuery.use(delegator).from("FixedAsset").where("fixedAssetId", compat.fixedAssetId).queryOne()
            [
                fixedAssetId: compat.fixedAssetId,
                fixedAssetName: asset?.fixedAssetName,
                serialNumber: asset?.serialNumber,
                comments: compat.comments
            ]
        }

        out.print(new JsonBuilder([
            productId: product.productId,
            productName: product.productName,
            internalName: product.internalName,
            description: product.description,
            brandName: product.brandName,
            productWeight: product.productWeight,
            quantityUomId: product.quantityUomId,
            statusId: product.salesDiscontinuationDate ? "DISCONTINUED" : "ACTIVE",
            crossReferences: xrefList,
            compatibleEquipment: compatList
        ]).toString())
        return "success"
    }
    // ======================== UPDATE ========================
    else if (action == "update") {
        String productId = request.getParameter("productId")
        if (!productId) {
            response.setStatus(400)
            out.print(new JsonBuilder([error: "Missing productId parameter"]).toString())
            return "error"
        }

        def product = EntityQuery.use(delegator).from("Product").where("productId", productId).queryOne()
        if (!product) {
            response.setStatus(404)
            out.print(new JsonBuilder([error: "Part not found: " + productId]).toString())
            return "error"
        }

        // Update fields if provided
        String productName = request.getParameter("productName")
        String internalName = request.getParameter("internalName")
        String description = request.getParameter("description")
        String brandName = request.getParameter("brandName")
        String quantityUomId = request.getParameter("quantityUomId")
        String productWeight = request.getParameter("productWeight")
        String statusId = request.getParameter("statusId")

        if (productName) product.set("productName", productName)
        if (internalName) product.set("internalName", internalName)
        if (description) product.set("description", description)
        if (brandName) product.set("brandName", brandName)
        if (quantityUomId) product.set("quantityUomId", quantityUomId)
        if (productWeight) product.set("productWeight", new BigDecimal(productWeight))
        if (statusId) {
            if (statusId == "DISCONTINUED") {
                product.set("salesDiscontinuationDate", new java.sql.Timestamp(System.currentTimeMillis()))
            } else if (statusId == "ACTIVE") {
                product.set("salesDiscontinuationDate", null)
            }
        }

        delegator.store(product)

        out.print(new JsonBuilder([
            success: true,
            productId: productId,
            message: "Part updated successfully"
        ]).toString())
        return "success"
    }
    // ======================== DELETE (Soft) ========================
    else if (action == "delete") {
        String productId = request.getParameter("productId")
        if (!productId) {
            response.setStatus(400)
            out.print(new JsonBuilder([error: "Missing productId parameter"]).toString())
            return "error"
        }

        def product = EntityQuery.use(delegator).from("Product").where("productId", productId).queryOne()
        if (!product) {
            response.setStatus(404)
            out.print(new JsonBuilder([error: "Part not found: " + productId]).toString())
            return "error"
        }

        // Soft delete: set salesDiscontinuationDate
        product.set("salesDiscontinuationDate", new java.sql.Timestamp(System.currentTimeMillis()))
        delegator.store(product)

        out.print(new JsonBuilder([
            success: true,
            productId: productId,
            message: "Part marked as discontinued"
        ]).toString())
        return "success"
    }
    // ======================== SEARCH ========================
    else if (action == "search") {
        String q = request.getParameter("q")
        if (!q) {
            response.setStatus(400)
            out.print(new JsonBuilder([error: "Missing 'q' search parameter"]).toString())
            return "error"
        }

        String searchPattern = "%" + q + "%"

        // Search across Product fields
        List<EntityCondition> searchOr = []
        searchOr.add(EntityCondition.makeCondition("productId", EntityOperator.LIKE, searchPattern))
        searchOr.add(EntityCondition.makeCondition("internalName", EntityOperator.LIKE, searchPattern))
        searchOr.add(EntityCondition.makeCondition("productName", EntityOperator.LIKE, searchPattern))
        searchOr.add(EntityCondition.makeCondition("description", EntityOperator.LIKE, searchPattern))
        searchOr.add(EntityCondition.makeCondition("brandName", EntityOperator.LIKE, searchPattern))

        def orCondition = EntityCondition.makeCondition(searchOr, EntityOperator.OR)

        def products = EntityQuery.use(delegator)
            .from("Product")
            .where(EntityCondition.makeCondition([
                EntityCondition.makeCondition("productTypeId", EntityOperator.EQUALS, "FINISHED_GOOD"),
                orCondition
            ], EntityOperator.AND))
            .maxRows(20)
            .queryList()

        // Also search in PartCrossReference
        def xrefHits = EntityQuery.use(delegator)
            .from("PartCrossReference")
            .where(EntityCondition.makeCondition("crossRefPartNumber", EntityOperator.LIKE, searchPattern))
            .maxRows(20)
            .queryList()

        // Merge results: add products found via cross-ref
        Set<String> productIds = products.collect { it.productId } as Set
        for (def xref : xrefHits) {
            if (!productIds.contains(xref.productId)) {
                def prod = EntityQuery.use(delegator).from("Product").where("productId", xref.productId).queryOne()
                if (prod) {
                    products.add(prod)
                    productIds.add(prod.productId)
                }
            }
        }

        def resultList = products.collect { prod -> [
            productId: prod.productId,
            productName: prod.productName,
            internalName: prod.internalName,
            description: prod.description,
            brandName: prod.brandName,
            statusId: prod.salesDiscontinuationDate ? "DISCONTINUED" : "ACTIVE"
        ] }

        out.print(new JsonBuilder([
            results: resultList,
            totalFound: resultList.size(),
            query: q
        ]).toString())
        return "success"
    }
    else {
        response.setStatus(400)
        out.print(new JsonBuilder([error: "Invalid action. Use: list, create, get, update, delete, search"]).toString())
        return "error"
    }

} catch (Exception e) {
    response.setStatus(500)
    out.print(new JsonBuilder([error: e.getMessage()]).toString())
    return "error"
}
