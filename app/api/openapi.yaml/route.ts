import yaml from "yaml";
import { spec } from "../spec";
export const dynamic = 'force-dynamic'
export const GET = async () => new Response(yaml.stringify(spec), { headers: { "Content-Type": "text/yaml" } });
