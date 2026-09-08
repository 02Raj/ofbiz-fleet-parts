import groovy.json.JsonBuilder
import org.apache.ofbiz.entity.GenericValue
import org.apache.ofbiz.entity.util.EntityQuery
import java.sql.Timestamp

response.setContentType("application/json")
def out = response.getWriter()

try {
    String action = request.getParameter("action")
    
    if (action == "add") {
        String productId = request.getParameter("productId")
        String fixedAssetId = request.getParameter("fixedAssetId")
        
        if (!productId || !fixedAssetId) {
            response.setStatus(400)
            out.print(new JsonBuilder([error: "Missing productId or fixedAssetId parameter"]).toString())
            return "error"
        }
        
        // Use custom entity created in Phase 1
        GenericValue compatibility = delegator.makeValue("PartEquipmentCompatibility", [
            productId: productId,
            fixedAssetId: fixedAssetId,
            fromDate: new Timestamp(System.currentTimeMillis())
        ])
        
        compatibility.create()
        
        out.print(new JsonBuilder([
            success: true,
            message: "Part mapped to Equipment successfully",
            productId: productId,
            fixedAssetId: fixedAssetId
        ]).toString())
        return "success"
    } 
    else if (action == "check") {
        String productId = request.getParameter("productId")
        String fixedAssetId = request.getParameter("fixedAssetId")
        
        if (!productId || !fixedAssetId) {
            response.setStatus(400)
            out.print(new JsonBuilder([error: "Missing productId or fixedAssetId parameter"]).toString())
            return "error"
        }
        
        long count = EntityQuery.use(delegator)
            .from("PartEquipmentCompatibility")
            .where("productId", productId, "fixedAssetId", fixedAssetId)
            .filterByDate()
            .queryCount()
            
        boolean isCompatible = (count > 0)
        
        out.print(new JsonBuilder([
            productId: productId,
            fixedAssetId: fixedAssetId,
            isCompatible: isCompatible
        ]).toString())
        return "success"
    } else {
        response.setStatus(400)
        out.print(new JsonBuilder([error: "Invalid action. Use 'add' or 'check'"]).toString())
        return "error"
    }

} catch (Exception e) {
    response.setStatus(500)
    out.print(new JsonBuilder([error: e.getMessage()]).toString())
    return "error"
}
