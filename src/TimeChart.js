import React from 'react';
import Chart from 'chart.js';
import Palette from './Palette.js';

class TimeChart extends React.Component {
    componentWillReceiveProps(nextProps) {
        if (nextProps.benchmarks.length === 0 && this.chart) {
            this.destroyChart();
        }
    }
    arrayEquals(a1, a2) {
        return (a1 === a2) || (a1.length === a2.length && JSON.stringify(a1) === JSON.stringify(a2));
    }
    componentDidUpdate(prevProps, prevState) {
        if (!this.arrayEquals(this.props.benchmarks, prevProps.benchmarks)) {
            if (prevProps.benchmarks.length === 0) {
                this.createChart();
            }
            this.showChart(this.props.benchmarks);
        }
    }
    createChart() {
        const ctx = document.getElementById("result-chart");
        const chartOptions = {
            title: {
                display: true,
                text: 'ratio (CPU time / Noop time)',
                position: 'bottom'
            },
            legend: {
                display: false
            },
            tooltips: {
                mode: 'index',
                intersect: false
            },
            scales: {
                yAxes: [{
                    ticks: {
                        beginAtZero: true
                    }
                }]
            }
        };
        this.chart = new Chart(ctx, {
            type: 'bar',
            options: chartOptions
        });
    }
    destroyChart() {
        this.chart.destroy();
        this.chart = null;
    }
    showChart(chart) {
        const length = chart.length - 1
        if (length > 0) {
            const names = chart.map(v => v.name);
            const times = chart.map(v => v.cpu_time);
            const colors = chart.map((v, i) => v.name === 'Noop' ? '#000' : Palette.pickColor(i, length));
            const chartData = [{
                data: times,
                backgroundColor: colors
            }];
            this.chart.data.labels = names;
            this.chart.data.datasets = chartData;
            this.chart.update();
            this.props.onNamesChange(names);
        }
    }
    render() {
        return (
            <div>
                {this.props.benchmarks.length ? < canvas id="result-chart" /> : null}
            </div>
        );
    }
}

export default TimeChart;
