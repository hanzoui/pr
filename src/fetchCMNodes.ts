import { fetchJson } from "./utils/fetchJson";

if (import.meta.main) {
  console.log(await fetchCMNodes());
}
export async function fetchCMNodes() {
  const customNodeListSource =
    process.env.CUSTOM_LIST_SOURCE ||
    "https://raw.githubusercontent.com/ltdrdata/Hanzo Manager/main/custom-node-list.json";
  const nodeList = (await fetchJson(customNodeListSource)) as {
    custom_nodes: {
      author: "Dr.Lt.Data" | string;
      title: "Hanzo Manager" | string;
      id: "manager" | string;
      reference: "https://github.com/ltdrdata/Hanzo Manager" | string;
      files: ["https://github.com/ltdrdata/Hanzo Manager"] | string[];
      install_type: "git-clone" | string;
      description: "Hanzo Manager itself is also a custom node." | string;
    }[];
  };
  return nodeList.custom_nodes;
}
