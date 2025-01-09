import React, { useEffect, useRef } from 'react';
import ForceGraph2D from "react-force-graph-2d";

const DirectedGraph = ({ data }) => {
    const graphRef = useRef();

    useEffect(() => {
        if (graphRef.current) {
          // Optional customization after rendering
          graphRef.current.d3Force("link").distance(75);
        }
      }, []);

    return <div>
        <ForceGraph2D
            ref={graphRef}
            graphData={data}
            nodeRelSize={6}
            nodeCanvasObject={(node, ctx, globalScale) => {
                // Draw node label
                const label = node.name;
                const fontSize = 12 / globalScale; // Scale font size based on zoom level
                ctx.font = `${fontSize}px Sans-Serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillStyle = "black"; // Label color
                ctx.fillText(label, node.x, node.y + 10); // Offset label slightly below the node
            }}
            nodeCanvasObjectMode={() => "after"} // Ensures labels are drawn after nodes
            linkCanvasObject={(link, ctx, globalScale) => {
                // Draw edge
                const startX = link.source.x;
                const startY = link.source.y;
                const endX = link.target.x;
                const endY = link.target.y;

                // Draw edge line
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.strokeStyle = "black"; // Edge color
                ctx.lineWidth = 1; // Edge thickness
                ctx.stroke();

                // Draw edge labels
                const label = link.label;
                if (label) {
                    const midX = (startX + endX) / 2;
                    const midY = (startY + endY) / 2;

                    const angle = Math.atan2(endY - startY, endX - startX);
                    const offsetX = Math.cos(angle + Math.PI / 2) * 10; // Offset in Y direction
                    const offsetY = Math.sin(angle + Math.PI / 2) * 10; // Offset in X direction

                    const fontSize = 12 / globalScale; // Scale font size based on zoom level
                    ctx.font = `${fontSize}px Sans-Serif`;
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillStyle = "black"; // Label color
                    ctx.fillText(label, midX + offsetX, midY + offsetY);
                }
            }}
            linkColor={() => "black"} // Set edge line color to black
            linkWidth={6} // Set edge line thickness
            linkDistance={300}
            linkDirectionalArrowLength={6} // Adds directional arrows
            linkDirectionalArrowRelPos={1} // Positions arrow at the end of the link
            linkLabel={(link) => link.properties} // Displays edge labels
            nodeAutoColorBy="id" // Automatically colors nodes by ID
            linkDirectionalArrowColor={() => "black"} // Set arrow color to black
            width={600}
            height={300}
        />
    </div>
};

export default DirectedGraph;
