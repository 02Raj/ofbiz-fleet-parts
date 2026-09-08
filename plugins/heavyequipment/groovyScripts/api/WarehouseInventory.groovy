import groovy.json.JsonBuilder
import org.apache.ofbiz.entity.GenericValue
import org.apache.ofbiz.entity.util.EntityQuery

response.setContentType("application/json")
def out = response.getWriter()

try {
    String facilityId = request.getParameter("facilityId")
    String productId = request.getParameter("productId")
    
    if (!facilityId || !productId) {
        response.setStatus(400)
        out.print(new JsonBuilder([error: "Missing facilityId or productId parameter"]).toString())
        return "error"
    }

    // Use OFBiz out-of-the-box inventory service for accurate ATP (Available To Promise) and QOH (Quantity On Hand)
    def result = dispatcher.runSync("getInventoryAvailableByFacility", [
        productId: productId,
        facilityId: facilityId,
        userLogin: request.getSession().getAttribute("userLogin") ?: EntityQuery.use(delegator).from("UserLogin").where("userLoginId", "system").queryOne()
    ])
    
    def jsonResult = [
        productId: productId,
        facilityId: facilityId,
        quantityOnHandTotal: result.quantityOnHandTotal,
        availableToPromiseTotal: result.availableToPromiseTotal
    ]

    out.print(new JsonBuilder(jsonResult).toString())
    return "success"
} catch (Exception e) {
    response.setStatus(500)
    out.print(new JsonBuilder([error: e.getMessage()]).toString())
    return "error"
}
