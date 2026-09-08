import groovy.json.JsonBuilder
import org.apache.ofbiz.entity.GenericValue
import org.apache.ofbiz.entity.util.EntityQuery
import org.apache.ofbiz.service.ServiceUtil

response.setContentType("application/json")
def out = response.getWriter()

try {
    def userLogin = request.getSession().getAttribute("userLogin") ?: EntityQuery.use(delegator).from("UserLogin").where("userLoginId", "system").queryOne()
    
    String orderId = request.getParameter("orderId")
    String orderItemSeqId = request.getParameter("orderItemSeqId") ?: "00001"
    String facilityId = request.getParameter("facilityId")
    String productId = request.getParameter("productId")
    String quantityAcceptedStr = request.getParameter("quantityAccepted")
    
    if (!orderId || !facilityId || !productId || !quantityAcceptedStr) {
        response.setStatus(400)
        out.print(new JsonBuilder([error: "Missing required parameters (orderId, facilityId, productId, quantityAccepted)"]).toString())
        return "error"
    }

    BigDecimal quantityAccepted = new BigDecimal(quantityAcceptedStr)

    // Call the core OFBiz service to receive inventory against a PO
    Map serviceCtx = [
        orderId: orderId,
        orderItemSeqId: orderItemSeqId,
        facilityId: facilityId,
        productId: productId,
        quantityAccepted: quantityAccepted,
        quantityRejected: BigDecimal.ZERO,
        inventoryItemTypeId: "NON_SERIAL_INV_ITEM",
        datetimeReceived: new java.sql.Timestamp(System.currentTimeMillis()),
        userLogin: userLogin
    ]

    def result = dispatcher.runSync("receiveInventoryProduct", serviceCtx)
    
    if (ServiceUtil.isError(result)) {
        throw new Exception(ServiceUtil.getErrorMessage(result))
    }

    out.print(new JsonBuilder([
        success: true,
        message: "Inventory Received successfully",
        inventoryItemId: result.inventoryItemId
    ]).toString())
    return "success"

} catch (Exception e) {
    response.setStatus(500)
    out.print(new JsonBuilder([error: e.getMessage()]).toString())
    return "error"
}
