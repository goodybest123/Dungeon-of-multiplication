
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface NumberVisualizerProps {
  a: number; // Number of Groups (Chests)
  b: number; // Items per Group (Gems)
  show: boolean;
}

const NumberVisualizer: React.FC<NumberVisualizerProps> = ({ a, b, show }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !show) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 340;
    const height = 280;
    
    const g = svg.append("g");

    // We want to draw 'a' groups (containers).
    // Calculate grid for the Containers
    const containerCols = Math.ceil(Math.sqrt(a * (width/height)));
    const containerRows = Math.ceil(a / containerCols);
    
    const padding = 10;
    const containerWidth = (width - (padding * (containerCols + 1))) / containerCols;
    const containerHeight = (height - (padding * (containerRows + 1))) / containerRows;
    const containerSize = Math.min(containerWidth, containerHeight); // Keep square-ish

    const containersData = Array.from({ length: a }, (_, i) => i);

    const containers = g.selectAll(".container-group")
      .data(containersData)
      .enter()
      .append("g")
      .attr("class", "container-group")
      .attr("transform", (d, i) => {
        const col = i % containerCols;
        const row = Math.floor(i / containerCols);
        const x = padding + col * (containerSize + padding) + (width - (containerCols * (containerSize + padding))) / 2;
        const y = padding + row * (containerSize + padding) + (height - (containerRows * (containerSize + padding))) / 2;
        return `translate(${x}, ${y})`;
      });

    // Draw Chest/Container Background
    containers.append("rect")
      .attr("width", containerSize)
      .attr("height", containerSize)
      .attr("rx", 8)
      .attr("fill", "#4c1d95") // Violet-900 (Chest)
      .attr("stroke", "#fbbf24") // Gold trim
      .attr("stroke-width", 2)
      .attr("class", "shadow-sm");
    
    // Draw "Lid" line
    containers.append("line")
      .attr("x1", 0)
      .attr("y1", containerSize * 0.3)
      .attr("x2", containerSize)
      .attr("y2", containerSize * 0.3)
      .attr("stroke", "#fbbf24")
      .attr("stroke-width", 1);

    // Now draw 'b' items INSIDE each container
    // Calculate mini-grid for items
    const itemCols = Math.ceil(Math.sqrt(b));
    const itemRows = Math.ceil(b / itemCols);
    
    // Available space inside the "open" part of the chest (bottom 70%)
    const innerPadding = 4;
    const innerWidth = containerSize - (innerPadding * 2);
    const innerHeight = (containerSize * 0.7) - (innerPadding * 2);
    const innerOffsetY = (containerSize * 0.3) + innerPadding;

    const itemSize = Math.min(innerWidth / itemCols, innerHeight / itemRows) * 0.8;
    const itemSpacingX = innerWidth / itemCols;
    const itemSpacingY = innerHeight / itemRows;

    containers.each(function(d) {
      const containerGroup = d3.select(this);
      
      const itemsData = Array.from({ length: b }, (_, j) => j);
      
      containerGroup.selectAll(".gem")
        .data(itemsData)
        .enter()
        .append("circle")
        .attr("class", "gem")
        .attr("cx", (d, i) => {
            const col = i % itemCols;
            // Center the grid of items inside the box
            const gridWidth = itemCols * itemSpacingX;
            const startX = innerPadding + (innerWidth - gridWidth)/2 + (itemSpacingX/2);
            return startX + col * itemSpacingX;
        })
        .attr("cy", (d, i) => {
            const row = Math.floor(i / itemCols);
             const gridHeight = itemRows * itemSpacingY;
            const startY = innerOffsetY + (innerHeight - gridHeight)/2 + (itemSpacingY/2);
            return startY + row * itemSpacingY;
        })
        .attr("r", 0) // Animate from 0
        .attr("fill", (d, i) => {
            const colors = ["#22d3ee", "#e879f9", "#34d399", "#fbbf24", "#f472b6"]; // Cyan, Fuchsia, Emerald, Amber, Pink
            return colors[i % colors.length];
        })
        .attr("stroke", "white")
        .attr("stroke-width", 1)
        .transition()
        .delay((d, i) => i * 50)
        .duration(400)
        .attr("r", itemSize / 2);
    });

  }, [a, b, show]);

  if (!show) return null;

  return (
    <div className="w-full max-w-sm bg-indigo-950 rounded-xl p-4 border-4 border-indigo-500 shadow-xl mt-4 relative overflow-hidden mx-auto">
        {/* Decorative corner bolts */}
        <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-indigo-400"></div>
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-indigo-400"></div>
        <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-indigo-400"></div>
        <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-indigo-400"></div>

        <h3 className="text-center text-amber-400 mb-2 text-lg font-medieval tracking-widest drop-shadow-md">Magical Sight</h3>
        <div className="flex justify-center">
            <svg ref={svgRef} viewBox="0 0 340 280" className="w-full h-auto max-h-[300px] overflow-visible" />
        </div>
        <div className="text-center text-indigo-200 text-base mt-2 font-bold bg-indigo-900 py-2 rounded-lg border border-indigo-700">
            <span className="text-amber-400">{a}</span> Chests × <span className="text-emerald-400">{b}</span> Gems = <span className="text-white text-xl">{a * b}</span> Total
        </div>
    </div>
  );
};

export default NumberVisualizer;
