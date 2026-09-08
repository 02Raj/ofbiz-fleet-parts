import groovy.json.JsonBuilder
import org.apache.ofbiz.entity.GenericValue
import org.apache.ofbiz.entity.util.EntityQuery

response.setContentType("application/json")
def out = response.getWriter()

try {
    String productId = request.getParameter("productId")
    
    if (!productId) {
        response.setStatus(400)
        out.print(new JsonBuilder([error: "Missing productId parameter"]).toString())
        return "error"
    }

    GenericValue product = EntityQuery.use(delegator).from("Product").where("productId", productId).queryOne()
    
    if (!product) {
        response.setStatus(404)
        out.print(new JsonBuilder([error: "Part not found"]).toString())
        return "error"
    }

    // Look up compatibility (using our custom entity)
    def compatibilities = EntityQuery.use(delegator).from("PartEquipmentCompatibility").where("productId", productId).queryList()
    def compatList = compatibilities.collect { it.fixedAssetId }

    def result = [
        productId: product.productId,
        internalName: product.internalName,
        description: product.description,
        productTypeId: product.productTypeId,
        compatibleEquipment: compatList
    ]

    out.print(new JsonBuilder(result).toString())
    return "success"
} catch (Exception e) {
    response.setStatus(500)
    out.print(new JsonBuilder([error: e.getMessage()]).toString())
    return "error"
}
