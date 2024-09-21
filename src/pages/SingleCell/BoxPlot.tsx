import React, { useEffect, useRef, useState } from 'react';
import {
    VictoryChart,
    VictoryScatter,
    VictoryBoxPlot,
    VictoryTooltip,
    VictoryAxis,
} from 'victory';
import { saveSvgAsPng } from 'save-svg-as-png';
import { jsPDF } from 'jspdf-yworks';
import svg2pdf from 'svg2pdf.js';
import { handleDownloadSVG, handleDownloadPDF } from './downloadUtils';
import LoadingIndicator from 'shared/components/loadingIndicator/LoadingIndicator';
interface DropdownOption {
    label: string;
    value: string;
}
interface ScatterBoxPlotProps {
    data: any;
    scatterColor: any;
    selectedSamplesExpression: DropdownOption[];
    selectedSampleExpressionTissue: DropdownOption[];
}

const ScatterBoxPlot: React.FC<ScatterBoxPlotProps> = ({
    data,
    scatterColor,
    selectedSamplesExpression,
    selectedSampleExpressionTissue,
}) => {
    const [filteredData, setFilteredData] = useState<any>(data);
    console.log(selectedSamplesExpression, 'expressionFilter');

    const chartRef = useRef<HTMLDivElement>(null);

    const [downloadOptionsVisible, setDownloadOptionsVisible] = useState(false);
    const [optionsVisible, setOptionsVisible] = useState(false);
    const processData = (cellTypeData: any, index: number) => {
        const filteredData = cellTypeData.filter(
            (item: any) => !isNaN(item.value)
        );

        const scatterData = filteredData.map((item: any) => ({
            x: item.x, // Using index + 1 for sequential numbers
            y: parseFloat(item.value),
            label: ` ${item.parentId}\n Tissue Name: ${item.tissuename}\n Value: ${item.value} `,
            color: item.color,
            strokeColor: item.strokeColor,
            tissueColor: item.tissueColor,
            tissueStrokeColor: item.tissueStrokeColor,
            bwColor: item.bwColor,
            bwStrokeColor: item.bwStrokeColor,
        }));

        const boxPlotData = {
            x: index + 1, // Using index + 1 for sequential numbers
            y: filteredData.map((item: any) => parseFloat(item.value)),
        };

        return { scatterData, boxPlotData };
    };

    useEffect(() => {
        console.log('Filter is applied');

        const newFilteredData: any = {};

        if (
            selectedSamplesExpression.length === 0 &&
            selectedSampleExpressionTissue.length === 0
        ) {
            // If no samples are selected, assign all data to filteredData
            setFilteredData(data);
        } else {
            // Filter data based on selectedSamplesExpression
            Object.keys(data).forEach(cellType => {
                let n = selectedSamplesExpression.length;
                let m = selectedSampleExpressionTissue.length;

                const filteredCellTypeData = data[cellType].filter(
                    (item: any) => {
                        // First, check for both n > 0 and m > 0
                        if (n > 0 && m > 0) {
                            return (
                                selectedSamplesExpression.includes(
                                    item.parentId
                                ) &&
                                selectedSampleExpressionTissue.includes(
                                    item.tissuename
                                )
                            );
                        }
                        // Check if n > 0 and m == 0
                        else if (n > 0 && m === 0) {
                            return selectedSamplesExpression.includes(
                                item.parentId
                            );
                        }
                        // Check if n == 0 and m > 0
                        else if (n === 0 && m > 0) {
                            return selectedSampleExpressionTissue.includes(
                                item.tissuename
                            );
                        }
                        // Default case if none of the above conditions are met
                        return false;
                    }
                );

                if (filteredCellTypeData.length > 0) {
                    newFilteredData[cellType] = filteredCellTypeData;
                }
            });

            console.log(newFilteredData, 'newFilteredDatanewFilteredData');
            setFilteredData(newFilteredData);
        }

        console.log(newFilteredData, 'filtered data');
    }, [data, selectedSamplesExpression, selectedSampleExpressionTissue]);

    // Combine processed data for all cell types using filteredData
    const allScatterData: any[] = [];
    const allBoxPlotData: any[] = [];

    Object.entries(filteredData).forEach(([cellType, cellTypeData], index) => {
        const { scatterData, boxPlotData } = processData(cellTypeData, index);
        allScatterData.push(...scatterData);
        if (boxPlotData.y.length === 0) {
            boxPlotData.y = [0]; // Set y to [0] if empty
        }

        allBoxPlotData.push(boxPlotData);
    });

    const handleDownload = () => {
        const element = document.getElementById('div-to-download');

        if (element) {
            // Find the element to exclude
            const excludeElement = element.querySelector(
                '.exclude-from-svg'
            ) as HTMLElement;
            if (excludeElement) {
                // Hide the element to exclude
                excludeElement.style.display = 'none';
            }

            // Create an SVG element
            const svg = document.createElementNS(
                'http://www.w3.org/2000/svg',
                'svg'
            );
            svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            svg.setAttribute('width', element.offsetWidth.toString());
            svg.setAttribute('height', (element.offsetHeight + 150).toString());

            // Create a foreignObject element to hold the HTML content
            const foreignObject = document.createElementNS(
                'http://www.w3.org/2000/svg',
                'foreignObject'
            );
            foreignObject.setAttribute('width', '100%');
            foreignObject.setAttribute('height', '100%');

            // Clone the HTML content and append it to the foreignObject
            const clonedContent = element.cloneNode(true) as HTMLElement;
            foreignObject.appendChild(clonedContent);

            // Append the foreignObject to the SVG
            svg.appendChild(foreignObject);

            // Create a blob from the SVG and trigger a download
            const serializer = new XMLSerializer();
            const svgBlob = new Blob([serializer.serializeToString(svg)], {
                type: 'image/svg+xml;charset=utf-8',
            });
            const url = URL.createObjectURL(svgBlob);

            const link = document.createElement('a');
            link.href = url;
            link.download = `boxplot.svg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Revoke the object URL after download
            URL.revokeObjectURL(url);

            // Show the excluded element again
            if (excludeElement) {
                excludeElement.style.display = '';
            }
        } else {
            console.error('Element not found');
        }
    };
    const handleDownloadPDFWrapper = async () => {
        if (chartRef.current) {
            const svg = chartRef.current.querySelector('svg');
            if (svg) {
                await handleDownloadPDF({ current: svg });
            }
        }
    };

    const CustomTooltip = (props: any) => (
        <VictoryTooltip
            {...props}
            flyoutStyle={{
                fill: 'white',
                stroke: '#ccc',
                strokeWidth: 1,
                filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))',
            }}
            pointerLength={10}
            pointerWidth={10}
            pointerOrientation="right"
            cornerRadius={5}
            flyoutPadding={{ left: 10, right: 10, top: 5, bottom: 5 }}
            flyoutWidth={800}
            style={{
                fill: '#333',
                fontSize: 14,
            }}
            renderInPortal={false}
        />
    );
    return (
        <div
            ref={chartRef}
            style={{
                position: 'relative',
            }}
        >
            <div id="div-to-download">
                <VictoryChart
                    domainPadding={20}
                    height={850}
                    id="chart-svg"
                    width={1200}
                    padding={{
                        top: 80,
                        bottom: 250,
                        left: 130,
                        right: 80,
                    }}
                >
                    <VictoryAxis
                        tickValues={Object.keys(data).map(
                            (_, index) => index + 1
                        )}
                        tickFormat={Object.keys(data)}
                        style={{
                            tickLabels: {
                                angle: 45,
                                textAnchor: 'start',
                                fontSize: 14,
                            },
                        }}
                        offsetY={250}
                    />
                    <VictoryAxis
                        style={{
                            tickLabels: { fontSize: 14 },
                        }}
                        dependentAxis
                    />

                    <VictoryBoxPlot
                        data={allBoxPlotData}
                        x="x"
                        y="y"
                        labels={(datum: any) => datum.label}
                        boxWidth={45}
                        style={{
                            min: { stroke: '#999999' },
                            max: { stroke: '#999999' },
                            median: { stroke: '#999999' },
                            q1: { fill: '#EEEEEE' },
                            q3: { fill: '#EEEEEE' },
                            box: { fill: '#EEEEEE', stroke: '#555' },
                            medianLabels: { fontSize: 12, fill: '#555' },
                            minLabels: { fill: '#555' },
                            maxLabels: { fill: '#555' },
                        }}
                    />

                    <VictoryScatter
                        data={allScatterData}
                        labels={(datum: any) => datum.label}
                        labelComponent={<CustomTooltip />}
                        size={(datum: any, active: any) => (active ? 6 : 4)}
                        style={{
                            data: {
                                fill: (datum: any) =>
                                    (scatterColor == 'sample id'
                                        ? datum.color
                                        : scatterColor == 'Default'
                                        ? datum.bwColor
                                        : datum.tissueColor) || '#c43a31',
                                stroke: (datum: any, active: any) =>
                                    active
                                        ? '#5f5f5f'
                                        : (scatterColor == 'sample id'
                                              ? datum.strokeColor
                                              : scatterColor == 'Default'
                                              ? datum.bwStrokeColor
                                              : datum.tissueStrokeColor) ||
                                          '#5f5f5f',
                                fillOpacity: 0.7,
                                strokeWidth: 1,
                            },
                        }}
                        events={[
                            {
                                target: 'data',
                                eventHandlers: {
                                    onMouseOver: () => [
                                        {
                                            target: 'labels',
                                            mutation: () => ({ active: true }),
                                        },
                                        {
                                            target: 'data',
                                            mutation: (props: any) => ({
                                                active: true,
                                                label: props.datum.label,
                                            }),
                                        },
                                    ],
                                    onMouseOut: () => [
                                        {
                                            target: 'labels',
                                            mutation: () => ({
                                                active: undefined,
                                            }),
                                        },
                                        {
                                            target: 'data',
                                            mutation: () => ({ active: false }),
                                        },
                                    ],
                                    onFocus: () => [
                                        {
                                            target: 'labels',
                                            mutation: () => ({ active: true }),
                                        },
                                        {
                                            target: 'data',
                                            mutation: (props: any) => ({
                                                active: true,
                                                label: props.datum.label,
                                            }),
                                        },
                                    ],
                                    onBlur: () => [
                                        {
                                            target: 'labels',
                                            mutation: () => ({
                                                active: undefined,
                                            }),
                                        },
                                        {
                                            target: 'data',
                                            mutation: () => ({ active: false }),
                                        },
                                    ],
                                },
                            },
                        ]}
                    />
                </VictoryChart>
            </div>
            <div
                className="exclude-from-svg"
                style={{
                    position: 'absolute',
                    top: '0',
                    right: '0',
                    cursor: 'pointer',
                    zIndex: 100,
                }}
                onMouseLeave={() => {
                    setOptionsVisible(false);
                    setDownloadOptionsVisible(false);
                }}
            >
                <i
                    className="fa fa-ellipsis-v"
                    aria-hidden="true"
                    onMouseEnter={() => setOptionsVisible(true)}
                    style={{
                        padding: '10px',
                        borderRadius: '50%',
                        border: '1px solid lightgrey',
                        transition: 'background-color 0.3s ease',
                    }}
                />
                {optionsVisible && (
                    <div
                        style={{
                            position: 'absolute',
                            top: '100%',
                            right: 0,
                            backgroundColor: 'white',
                            boxShadow: '0 0 10px rgba(0,0,0,0.2)',
                            zIndex: 200,
                            borderRadius: '4px',
                            overflow: 'hidden',
                            minWidth: '160px',
                            textAlign: 'center',
                        }}
                    >
                        <div
                            style={{
                                backgroundColor: 'white',
                                boxShadow: '0 0 10px rgba(0,0,0,0.2)',
                                zIndex: 200,
                                borderRadius: '4px',
                                overflow: 'hidden',
                            }}
                        >
                            <div
                                style={{
                                    padding: '8px',
                                    cursor: 'pointer',
                                    borderBottom: '1px solid #ddd',
                                    transition: 'background-color 0.3s ease',
                                }}
                                onClick={handleDownloadPDFWrapper}
                                onMouseEnter={e =>
                                    (e.currentTarget.style.backgroundColor =
                                        '#f0f0f0')
                                }
                                onMouseLeave={e =>
                                    (e.currentTarget.style.backgroundColor =
                                        'white')
                                }
                            >
                                <i
                                    className="fa fa-file-pdf-o"
                                    style={{
                                        marginRight: '8px',
                                    }}
                                />
                                PDF
                            </div>
                            <div
                                style={{
                                    padding: '8px',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.3s ease',
                                }}
                                onClick={handleDownload}
                                onMouseEnter={e =>
                                    (e.currentTarget.style.backgroundColor =
                                        '#f0f0f0')
                                }
                                onMouseLeave={e =>
                                    (e.currentTarget.style.backgroundColor =
                                        'white')
                                }
                            >
                                <i
                                    className="fa fa-file-image-o"
                                    style={{
                                        marginRight: '8px',
                                    }}
                                />
                                SVG
                            </div>
                            <div
                                style={{
                                    padding: '8px',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.3s ease',
                                }}
                                // onClick={handleDownloadData}
                                onMouseEnter={e =>
                                    (e.currentTarget.style.backgroundColor =
                                        '#f0f0f0')
                                }
                                onMouseLeave={e =>
                                    (e.currentTarget.style.backgroundColor =
                                        'white')
                                }
                            >
                                <i
                                    className="fa fa-database"
                                    style={{
                                        marginRight: '8px',
                                    }}
                                />
                                Data
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ScatterBoxPlot;
