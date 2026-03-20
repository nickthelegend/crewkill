import { databaseService } from "./src/DatabaseService.js";

async function check() {
  // Check operator
  const operator = await databaseService.getOperatorByKey("oper_IBppTOBVs4qJmBIG");
  console.log("Operator:", JSON.stringify(operator, null, 2));

  // Check agent
  const agent = await databaseService.getAgentByWallet("0x98a2A48707422a9cfd86EbC841d2F757174A8C97");
  console.log("Agent:", JSON.stringify(agent, null, 2));
}

check().catch(console.error);


