import groovy.json.JsonBuilder
import org.apache.ofbiz.entity.GenericValue
import org.apache.ofbiz.entity.util.EntityQuery
import org.apache.ofbiz.service.ServiceUtil
import java.sql.Timestamp

response.setContentType("application/json")
def out = response.getWriter()

try {
    def userLogin = request.getSession().getAttribute("userLogin") ?: EntityQuery.use(delegator).from("UserLogin").where("userLoginId", "system").queryOne()
    String action = request.getParameter("action")
    
    if (action == "create") {
        String fixedAssetId = request.getParameter("fixedAssetId")
        String description = request.getParameter("description")
        String facilityId = request.getParameter("facilityId")
        String partsCsv = request.getParameter("parts") // comma separated productIds
        
        if (!fixedAssetId || !description) {
            response.setStatus(400)
            out.print(new JsonBuilder([error: "Missing fixedAssetId or description parameter"]).toString())
            return "error"
        }
        
        // 1. Create WorkEffort (Work Order)
        def workEffortCtx = [
            workEffortTypeId: "MAINTENANCE",
            currentStatusId: "WE_CREATED",
            workEffortName: "Maint for " + fixedAssetId,
            description: description,
            fixedAssetId: fixedAssetId,
            facilityId: facilityId,
            estimatedStartDate: new Timestamp(System.currentTimeMillis()),
            userLogin: userLogin
        ]
        
        def weResult = dispatcher.runSync("createWorkEffort", workEffortCtx)
        if (ServiceUtil.isError(weResult)) {
            throw new Exception(ServiceUtil.getErrorMessage(weResult))
        }
        String workEffortId = weResult.workEffortId
        
        // 2. Reserve Parts
        List<String> reservedParts = []
        if (partsCsv && facilityId) {
            String[] parts = partsCsv.split(",")
            for (String productId : parts) {
                productId = productId.trim()
                if (productId) {
                    // Create WorkEffortGoodStandard to link part to WO
                    delegator.create("WorkEffortGoodStandard", [
                        workEffortId: workEffortId,
                        productId: productId,
                        workEffortGoodStdTypeId: "IMPLEMENT",
                        statusId: "WEGS_CREATED",
                        estimatedQuantity: BigDecimal.ONE
                    ])
                    
                    // Reserve inventory using core service
                    def reserveCtx = [
                        workEffortId: workEffortId,
                        productId: productId,
                        facilityId: facilityId,
                        quantity: BigDecimal.ONE,
                        requireInventory: "Y",
                        userLogin: userLogin
                    ]
                    def resResult = dispatcher.runSync("assignInventoryToWorkEffort", reserveCtx)
                    if (!ServiceUtil.isError(resResult)) {
                        reservedParts.add(productId)
                    }
                }
            }
        }
        
        out.print(new JsonBuilder([
            success: true,
            workEffortId: workEffortId,
            fixedAssetId: fixedAssetId,
            status: "CREATED",
            reservedParts: reservedParts
        ]).toString())
        return "success"
    } 
    else if (action == "list") {
        String fixedAssetId = request.getParameter("fixedAssetId")
        def query = EntityQuery.use(delegator).from("WorkEffort").where("workEffortTypeId", "MAINTENANCE")
        if (fixedAssetId) {
            query.where("workEffortTypeId", "MAINTENANCE", "fixedAssetId", fixedAssetId)
        }
        
        def woList = query.queryList()
        def resultList = woList.collect { [
            workEffortId: it.workEffortId,
            fixedAssetId: it.fixedAssetId,
            statusId: it.currentStatusId,
            description: it.description
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
