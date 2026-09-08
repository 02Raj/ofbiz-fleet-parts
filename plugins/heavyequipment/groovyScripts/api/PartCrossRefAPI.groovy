import groovy.json.JsonBuilder
import org.apache.ofbiz.entity.GenericValue
import org.apache.ofbiz.entity.util.EntityQuery

response.setContentType("application/json")
def out = response.getWriter()

try {
    def userLogin = request.getSession().getAttribute("userLogin") ?: EntityQuery.use(delegator).from("UserLogin").where("userLoginId", "system").queryOne()
    String action = request.getParameter("action")

    // ======================== ADD ========================
    if (action == "add") {
        String productId = request.getParameter("productId")
        String crossRefType = request.getParameter("crossRefType")
        String crossRefPartNumber = request.getParameter("crossRefPartNumber")
        String crossRefBrand = request.getParameter("crossRefBrand")
        String crossRefProductId = request.getParameter("crossRefProductId")
        String notes = request.getParameter("notes")

        if (!productId || !crossRefType || !crossRefPartNumber) {
            response.setStatus(400)
            out.print(new JsonBuilder([error: "Missing required parameters: productId, crossRefType, crossRefPartNumber"]).toString())
            return "error"
        }

        // Validate that source product exists
        def product = EntityQuery.use(delegator).from("Product").where("productId", productId).queryOne()
        if (!product) {
            response.setStatus(404)
            out.print(new JsonBuilder([error: "Product not found: " + productId]).toString())
            return "error"
        }

        // Validate crossRefType
        def validTypes = ["OEM", "MANUFACTURER", "SUPPLIER", "ALTERNATE", "SUPERSEDED", "CUSTOMER"]
        if (!validTypes.contains(crossRefType)) {
            response.setStatus(400)
            out.print(new JsonBuilder([error: "Invalid crossRefType. Use: " + validTypes.join(", ")]).toString())
            return "error"
        }

        String crossRefId = delegator.getNextSeqId("PartCrossReference")
        delegator.create("PartCrossReference", [
            crossRefId: crossRefId,
            productId: productId,
            crossRefType: crossRefType,
            crossRefPartNumber: crossRefPartNumber,
            crossRefBrand: crossRefBrand ?: "",
            crossRefProductId: crossRefProductId,
            notes: notes,
            fromDate: new java.sql.Timestamp(System.currentTimeMillis())
        ])

        out.print(new JsonBuilder([
            success: true,
            crossRefId: crossRefId,
            productId: productId,
            crossRefType: crossRefType,
            crossRefPartNumber: crossRefPartNumber,
            crossRefBrand: crossRefBrand
        ]).toString())
        return "success"
    }
    // ======================== LIST ========================
    else if (action == "list") {
        String productId = request.getParameter("productId")

        if (!productId) {
            response.setStatus(400)
            out.print(new JsonBuilder([error: "Missing productId parameter"]).toString())
            return "error"
        }

        def xrefs = EntityQuery.use(delegator).from("PartCrossReference").where("productId", productId).queryList()

        def resultList = xrefs.collect { [
            crossRefId: it.crossRefId,
            productId: it.productId,
            crossRefType: it.crossRefType,
            crossRefPartNumber: it.crossRefPartNumber,
            crossRefBrand: it.crossRefBrand,
            crossRefProductId: it.crossRefProductId,
            notes: it.notes
        ] }

        out.print(new JsonBuilder(resultList).toString())
        return "success"
    }
    // ======================== DELETE ========================
    else if (action == "delete") {
        String crossRefId = request.getParameter("crossRefId")

        if (!crossRefId) {
            response.setStatus(400)
            out.print(new JsonBuilder([error: "Missing crossRefId parameter"]).toString())
            return "error"
        }

        def xref = EntityQuery.use(delegator).from("PartCrossReference").where("crossRefId", crossRefId).queryOne()
        if (!xref) {
            response.setStatus(404)
            out.print(new JsonBuilder([error: "Cross-reference not found: " + crossRefId]).toString())
            return "error"
        }

        delegator.removeValue(xref)

        out.print(new JsonBuilder([
            success: true,
            message: "Cross-reference deleted",
            crossRefId: crossRefId
        ]).toString())
        return "success"
    }
    // ======================== SEARCH BY PART NUMBER ========================
    else if (action == "search") {
        String partNumber = request.getParameter("partNumber")

        if (!partNumber) {
            response.setStatus(400)
            out.print(new JsonBuilder([error: "Missing partNumber parameter"]).toString())
            return "error"
        }

        def xrefs = EntityQuery.use(delegator)
            .from("PartCrossReference")
            .where(org.apache.ofbiz.entity.condition.EntityCondition.makeCondition(
                "crossRefPartNumber",
                org.apache.ofbiz.entity.condition.EntityOperator.LIKE,
                "%" + partNumber + "%"
            ))
            .maxRows(20)
            .queryList()

        def resultList = xrefs.collect { xref ->
            def product = EntityQuery.use(delegator).from("Product").where("productId", xref.productId).queryOne()
            [
                crossRefId: xref.crossRefId,
                productId: xref.productId,
                productName: product?.productName,
                crossRefType: xref.crossRefType,
                crossRefPartNumber: xref.crossRefPartNumber,
                crossRefBrand: xref.crossRefBrand
            ]
        }

        out.print(new JsonBuilder([
            results: resultList,
            totalFound: resultList.size(),
            query: partNumber
        ]).toString())
        return "success"
    }
    else {
        response.setStatus(400)
        out.print(new JsonBuilder([error: "Invalid action. Use: add, list, delete, search"]).toString())
        return "error"
    }

} catch (Exception e) {
    response.setStatus(500)
    out.print(new JsonBuilder([error: e.getMessage()]).toString())
    return "error"
}
