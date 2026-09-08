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
        String groupName = request.getParameter("groupName")
        
        if (!groupName) {
            response.setStatus(400)
            out.print(new JsonBuilder([error: "Missing groupName parameter"]).toString())
            return "error"
        }
        
        // Create PartyGroup
        def result = dispatcher.runSync("createPartyGroup", [groupName: groupName, userLogin: userLogin])
        if (ServiceUtil.isError(result)) {
            throw new Exception(ServiceUtil.getErrorMessage(result))
        }
        String partyId = result.partyId
        
        // Assign SUPPLIER role
        def roleResult = dispatcher.runSync("createPartyRole", [partyId: partyId, roleTypeId: "SUPPLIER", userLogin: userLogin])
        if (ServiceUtil.isError(roleResult)) {
            throw new Exception(ServiceUtil.getErrorMessage(roleResult))
        }
        
        out.print(new JsonBuilder([partyId: partyId, groupName: groupName, role: "SUPPLIER"]).toString())
        return "success"
    } 
    else if (action == "list") {
        def suppliers = EntityQuery.use(delegator)
            .from("PartyRoleAndPartyDetail")
            .where("roleTypeId", "SUPPLIER")
            .queryList()
            
        def supplierList = suppliers.collect { [
            partyId: it.partyId,
            groupName: it.groupName
        ] }
        
        out.print(new JsonBuilder(supplierList).toString())
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
