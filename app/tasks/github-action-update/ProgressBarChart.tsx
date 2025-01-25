"use client";

import { EChart } from "@kbox-labs/react-echarts";

// import ReactECharts from "echarts-for-react"; // or var ReactECharts = require('echarts-for-react');
/**
 *
 * @author: snomiao <snomiao@gmail.com>
 */
export default function ProgressBarChart({ data }: { data: readonly [string, number, string][] }) {
  return (
    <>
      <EChart
        style={{
          height: "100px",
          width: "100%",
        }}
        // xAxis={[
        //   {
        //     type: "time",
        //     axisLabel: {
        //       formatter: function (value) {
        //         return new Date(value).toISOString().slice(0, 10);
        //       },
        //     },
        //   },
        // ]}
        // yAxis={{
        //   type: "value",
        // }}
        // series={uniq(totalsData.flatMap((e) => Object.keys(omit("date", e)))).map((key) => ({
        //   type: "line",
        //   data: totalsData.map((e) => [e.date, e[key] ?? null]),
        // }))}
        {...{
          tooltip: {
            trigger: "axis",
            axisPointer: {
              type: "shadow", // 'shadow' as default; can also be 'line' or 'shadow'
            },
          },
          legend: {},
          grid: {
            left: "0",
            right: "0",
            bottom: "0",
            containLabel: false,
          },
          xAxis: {
            type: "value",
          },
          yAxis: {
            type: "category",
            data: ["Progress"],
          },
          series: data.map(([name, value, color]) => ({
            name,
            type: "bar",
            stack: "total",
            label: {
              show: true,
            },
            color,
            emphasis: {
              focus: "series",
            },
            data: [value],
          })),
        }}
      />
      {/* <ReactECharts
        // option={this.getOption()}
        notMerge={true}
        lazyUpdate={true}
        theme={"theme_name"}
        // onChartReady={this.onChartReadyCallback}
        // onEvents={EventsDict}
        // opts={}
        // data={

        // }
      /> */}
    </>
  );
}
