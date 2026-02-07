import React, { useCallback } from 'react';
import ReactFlow, {
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';

const nodeDefaults = {
    sourcePosition: 'right',
    targetPosition: 'left',
};

const ConnectivityGraph = ({ assets = [], connections = [] }) => {
    // Transform data to ReactFlow format
    const initialNodes = assets.map((asset, index) => ({
        id: asset.tag || `node-${index}`,
        type: 'default',
        data: { label: `${asset.tag}\n(${asset.type})` },
        position: { x: (index % 3) * 200 + 50, y: Math.floor(index / 3) * 150 + 50 }, // Grid layout
        style: {
            background: asset.type.includes('Pump') ? '#bfdbfe' :
                asset.type.includes('Vessel') ? '#fef08a' : '#fff',
            border: '2px solid black',
            fontWeight: 'bold',
            borderRadius: '0px'
        },
        ...nodeDefaults
    }));

    const initialEdges = connections.map((conn, index) => ({
        id: `e-${index}`,
        source: conn.source,
        target: conn.target,
        label: conn.medium || '',
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, color: 'black' },
        style: { stroke: 'black', strokeWidth: 2 }
    }));

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

    return (
        <div className="w-full h-[400px] border-2 border-black bg-gray-50 mt-4">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                fitView
            >
                <Controls showInteractive={false} />
                <Background gap={12} size={1} />
            </ReactFlow>
        </div>
    );
};

export default ConnectivityGraph;
