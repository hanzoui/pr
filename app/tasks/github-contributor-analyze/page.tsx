import { yaml } from "@/src/utils/yaml";
import * as d3 from "d3";
import { summaryGithubContributorAnalyzeTask } from "./summaryGithubContributorAnalyzeTask";
/**
 *
 * @author: snomiao <snomiao@gmail.com>
 */
export default async function GithubContributorAnalyzeTaskPage() {
  const data = await summaryGithubContributorAnalyzeTask();
  const csvContent = d3.csvFormat(data.json);
  const csvDataURL = `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
  return (
    <main>
      <h1>Github Contributor Analyze Task</h1>
      
      <h2>Totals</h2>
      <code>{yaml.stringify(data.total, null, 2)}</code>

      <h2>Details</h2>
      <button
        onClick={() => {
          const link = document.createElement("a");
          link.href = csvDataURL;
          link.download = "uniq-contributor-emails.csv";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }}
      >
        Download CSV
      </button>
      
    </main>
  );
}
