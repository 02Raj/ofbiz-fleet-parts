import groovy.json.JsonBuilder
import org.apache.ofbiz.entity.GenericValue
import org.apache.ofbiz.entity.util.EntityQuery
import org.apache.ofbiz.service.ServiceUtil

response.setContentType("application/json")
def out = response.getWriter()

try {
    def userLogin = request.getSession().getAttribute("userLogin") ?: EntityQuery.use(delegator).from("UserLogin").where("userLoginId", "system").queryOne()
    String action = request.getParameter("action")
    
    if (action == "create") {
        String fixedAssetName = request.getParameter("fixedAssetName")
        String serialNumber = request.getParameter("serialNumber")
        
        if (!fixedAssetName) {
            response.setStatus(400)
            out.print(new JsonBuilder([error: "Missing fixedAssetName parameter"]).toString())
            return "error"
        }
        
        // Create FixedAsset (Equipment)
        def result = dispatcher.runSync("createFixedAsset", [
            fixedAssetTypeId: "EQUIPMENT", 
            fixedAssetName: fixedAssetName, 
            serialNumber: serialNumber,
            userLogin: userLogin
        ])
        
        if (ServiceUtil.isError(result)) {
            throw new Exception(ServiceUtil.getErrorMessage(result))
        }
        
        out.print(new JsonBuilder([
            success: true,
            fixedAssetId: result.fixedAssetId, 
            fixedAssetName: fixedAssetName,
            serialNumber: serialNumber
        ]).toString())
        return "success"
    } 
    else if (action == "list") {
        def equipmentList = EntityQuery.use(delegator)
            .from("FixedAsset")
            .where("fixedAssetTypeId", "EQUIPMENT")
            .queryList()
            
        def resultList = equipmentList.collect { [
            fixedAssetId: it.fixedAssetId,
            fixedAssetName: it.fixedAssetName,
            serialNumber: it.serialNumber
        ] }
        
        out.print(new JsonBuilder(resultList).toString())
        return "success"
    } else {
        response.setStatus(400)
        out.print(new JsonBuilder([error: "Invalid action. Use 'create' or 'list'"]).toString())
        return "error"
    }

} catch (Exception e) {
    response.setStatus(500)
    out.print(new JsonBuilder([error: e.getMessage()]).toString())
    return "error"
}
