import React from 'react';
import CodeEditor from './CodeEditor.js';
import BashOutput from './BashOutput.js';
import CompileConfig from './CompileConfig.js';
import TimeChart from './TimeChart.js';
import { Button, ButtonToolbar, Row, Col, Container, Card, FormCheck, Form, ProgressBar } from 'react-bootstrap';
import { MdTimer } from "react-icons/md";

var request = require('request');
const protocolVersion = 3;

const startCode1 = `#include <cstdio>

int main() {
    puts("Hello World");
    return 0;
}
`;
const startCode2 = `#include <iostream>

int main() {
    std::cout << "Hello World\\n";
    return 0;
}
`;
const includeStr = '#include <benchmark/benchmark.h>\n';
const mainStr = '\nBENCHMARK_MAIN();';
const chartData = [{
    title: ["Compilation CPU Time", "Lower is faster"],
    property: "time",
    name: "Time",
    more: "slower",
    less: "faster"
}, {
    title: "Maximum resident memory size (kB)",
    property: "memory",
    name: "Memory",
    more: "more",
    less: "less"
}];
class Benchmark extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            texts: [startCode1, startCode2]
            , titles: ['cstdio', 'iostream']
            , graph: []
            , message: ''
            , sending: false
            , progress: 0
            , index: 0
            , options: Array(2).fill().map(a => ({
                compiler: "clang-9.0"
                , cppVersion: "20"
                , optim: "3"
                , lib: "gnu"
            }))
            , clean: false
            , force: false
            , benchNames: []
            , location: props.id
            , annotation: ''
            , isAnnotated: true
            , assemblyFull: false
            , chartIndex: 0
            , textsWrapped: false
            , optionsWrapped: true
        };

        let stateFromHash = this.getStateFromHash();
        if (stateFromHash) {
            this.state.text = this.importCode(stateFromHash.text);
            if (stateFromHash.compiler) this.state.compiler = stateFromHash.compiler;
            if (stateFromHash.cppVersion) this.state.cppVersion = stateFromHash.cppVersion;
            if (stateFromHash.optim) this.state.optim = stateFromHash.optim;
            if (stateFromHash.lib) this.state.lib = stateFromHash.lib;
        }

        this.graph = [];
        this.url = this.props.url;
        this.maxCodeSize = this.props.maxCodeSize;
    }
    getStateFromHash() {
        if (window.location.hash) {
            let state = this.decodeHash(window.location.hash);
            window.location.hash = "";
            if (state.text) {
                return state;
            }
        }

        return false;
    }
    componentDidMount() {
        if (this.props.id) {
            this.getCode(this.props.id);
        }
        this.props.onDisplay();
    }
    componentWillReceiveProps(nextProps) {
        if (this.props.id !== nextProps.id && this.state.location !== nextProps.id) {
            this.getCode(nextProps.id);
        }
    }
    makeGraph(result, titles) {
        return result.map((r, i) => ({ times: r.times, memories: r.memories, title: titles[i] })).filter(r => r.times !== undefined && r.times !== []).map((r, i) => {
            let times = r.times.map(t => parseFloat(t)).reduce((s, t) => (s + t)) / r.times.length;
            let memories = r.memories.map(t => parseFloat(t)).reduce((s, t) => (s + t)) / r.memories.length;
            return {
                x: r.title,
                time: times,
                memory: memories
            };
        });
    }
    getCode(id) {
        this.setState({
            sending: true,
            graph: [],
            annotation: '',
            message: ''
        });
        request.get(this.url + '/build/' + id, (err, res, body) => {
            this.setState({
                sending: false,
                clean: true,
                force: false
            });
            if (body) {
                let result = JSON.parse(body);
                if (result) {
                    if (result.result) {
                        let titles = result.tabs.map(t => t.title);
                        let options = result.tabs.map(t => ({
                            compiler: t.compiler
                            , cppVersion: t.cppVersion
                            , optim: t.optim
                            , lib: t.lib
                        }));
                        this.setState({
                            texts: result.tabs.map(t => t.code)
                            , titles: titles
                            , graph: this.makeGraph(result.result, titles)
                            , options: options
                            , location: id
                            , textsWrapped: result.tabs.every(v => v.code === result.tabs[0].code)
                            , optionsWrapped: options.every(o => o === options[0])
                        });
                    }
                    if (result.message) {
                        this.setState({
                            message: result.message
                        });
                    }
                }
            }
        });
    }
    sendCode() {
        if (this.state.texts.some(t => t.length > this.maxCodeSize)) {
            this.setState({
                graph: [],
                annotation: '',
                message: `Your code is ${this.state.texts.length} characters long, while the maximum code size is ${this.maxCodeSize}.
If you think this limitation is stopping you in a legitimate usage of quick-bench, please contact me.`
            });
        } else {
            this.setState({
                sending: true,
                graph: [],
                annotation: '',
                message: ''
            });
            this.setState({ progress: 0 });
            let interval = setInterval(() => {
                this.setState({ progress: this.state.progress + 100 / 120 });
            }, 1000);

            var obj = {
                "tabs": this.state.texts.map((c, i) => {
                    return {
                        "code": c,
                        "title": this.state.titles[i],
                        "compiler": this.state.options[i].compiler,
                        "optim": this.state.options[i].optim,
                        "cppVersion": this.state.options[i].cppVersion,
                        "lib": this.state.options[i].lib
                    }
                }),
                "protocolVersion": protocolVersion,
                "force": this.state.clean && this.state.force,
            };
            request({
                url: this.url + '/build/'
                , method: "POST"
                , json: true
                , headers: {
                    "content-type": "application/json"
                }
                , body: obj
            }, (err, res, body) => {
                this.setState({
                    sending: false,
                    clean: true,
                    force: false
                });
                clearInterval(interval);
                if (body.result) {
                    let g = this.makeGraph(body.result, this.state.titles)
                    this.setState({
                        graph: g,
                        location: body.id
                    });
                    this.props.onLocationChange(body.id);
                }
                if (body.annotation) {
                    this.setState({ annotation: body.annotation });
                }
                if (body.message) {
                    this.setState({ message: body.message });
                }
            });
        }
    }
    compilerCeId() {
        if (this.state.compiler.startsWith('clang'))
            return 'clang' + this.state.compiler.substr(6).replace('.', '') + '0';
        return 'g' + this.state.compiler.substr(4).replace('.', '');
    }
    optimCe() {
        switch (this.state.optim) {
            case 'G':
                return '-Og';
            case 'F':
                return '-Ofast';
            case 'S':
                return '-Os';
            default:
                return '-O' + this.state.optim;
        }
    }
    versionCe() {
        switch (this.state.cppVersion) {
            case '20':
                return '2a';
            case '17':
                return '1z';
            default:
                return this.state.cppVersion;
        }
    }
    b64UTFEncode(str) {
        return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (match, v) {
            return String.fromCharCode(parseInt(v, 16));
        }));
    }
    decodeHash(str) {
        try {
            let base64ascii = str.substr(1);
            if (base64ascii) {
                return JSON.parse(atob(base64ascii));
            }
        } catch (err) {
            console.error(err);
        }
        return false;
    }
    optionsCe() {
        const cppVersion = '-std=c++' + this.versionCe();
        return cppVersion + ' ' + this.optimCe();
    }
    exportCode() {
        return includeStr + this.state.text + mainStr;
    }
    importCode(text) {
        return text.replace(includeStr, '').replace(mainStr, '');
    }
    openCodeInCE() {
        var clientstate = {
            "sessions": [{
                "id": 0,
                "language": "c++",
                "source": this.exportCode(),
                "compilers": [{
                    "id": this.compilerCeId(),
                    "options": this.optionsCe(),
                    "libs": [{
                        "name": "benchmark",
                        "ver": "140"
                    }]
                }]
            }]
        };
        var link = window.location.protocol + '//godbolt.org/clientstate/' + this.b64UTFEncode(JSON.stringify(clientstate));
        window.open(link, '_blank');
    }
    setDirty() {
        this.setState({
            clean: false,
            force: false
        });
    }
    codeChanged(code) {
        this.setState({
            texts: code
        });
        this.setDirty();
    }
    forceChanged(e) {
        this.setState({
            force: e.target.checked
        });
    }
    onOptionsChange(options) {
        this.setState({ options: options });
        this.setDirty();
    }
    onTitlesChange(titles) {
        this.setState({ titles: titles });
        this.setDirty();
    }
    toggleAnnotated(e) {
        this.setState({ isAnnotated: e.target.checked });
    }
    buttonHeight() {
        const run = document.getElementById('Run');
        if (run == null)
            return '5px';
        const compStyle = window.getComputedStyle(run, null);
        // We remove 4px more because for some reason otherwise it is possible that the CE button ends-up slightly bigger than the run button
        // Which because the whole toolbar is the same size, would start an infinit loop of 
        // "run" growing -> CE grows to react -> is bigger than run -> grows the toolbar
        return `calc(${compStyle.height} - ${compStyle.paddingTop} - ${compStyle.paddingBottom} - 4px)`;
    }
    closeTab(removedIndex) {
        let texts = this.state.texts;
        texts.splice(removedIndex, 1);
        let titles = this.state.titles;
        titles.splice(removedIndex, 1);
        let opts = this.state.options;
        opts.splice(removedIndex, 1);
        this.setState({
            texts: texts,
            titles: titles,
            options: opts
        });

        this.setDirty();
    }
    addTab() {
        let texts = this.state.texts.concat(this.state.texts[this.state.index]);
        let titles = this.state.titles.concat(this.state.titles[this.state.index] + '2');
        let opts = this.state.options.concat({ ...this.state.options[this.state.index] });
        this.setState({
            texts: texts,
            titles: titles,
            options: opts
        });

        this.setDirty();
    }
    render() {
        return (
            <Container fluid>
                <Row className="full-size">
                    <Col sm={6} className="full-size">
                        <div className="code-editor">
                            <CodeEditor onChange={c => this.codeChanged(c)}
                                code={this.state.texts}
                                titles={this.state.titles}
                                names={this.state.benchNames}
                                index={this.state.index}
                                setIndex={i => this.setState({ index: i })}
                                closeTab={(i) => this.closeTab(i)}
                                addTab={() => this.addTab()}
                                onTitlesChange={t => this.onTitlesChange(t)}
                                wrapped={this.state.textsWrapped}
                                changeWrapped={w => this.setState({ textsWrapped: w })}
                            />
                        </div>
                    </Col>
                    <Col sm={6} className="right-block">
                        <div style={{ display: this.state.assemblyFull ? "none" : "block" }}>
                            <div className="compilation">
                                <Card body className="my-2">
                                    <CompileConfig options={this.state.options}
                                        onOptionsChange={o => this.onOptionsChange(o)}
                                        onTitlesChange={t => this.onTitlesChange(t)}
                                        titles={this.state.titles}
                                        index={this.state.index}
                                        setIndex={i => this.setState({ index: i })}
                                        closeTab={(i) => this.closeTab(i)}
                                        addTab={() => this.addTab()}
                                        wrapped={this.state.optionsWrapped}
                                        changeWrapped={(w, c) => this.setState({ optionsWrapped: w }, c)}
                                    />
                                    <hr className="config-separator" />
                                    <ButtonToolbar className="justify-content-between">
                                        <Form inline>
                                            <Button variant="primary" onClick={() => this.sendCode()} disabled={this.state.sending} className="mr-2" id="Run"> <MdTimer /> Build Time</Button>
                                            {this.state.clean ? <FormCheck ref="force" type="checkbox" custom checked={this.state.force} id="clean-cache" onChange={this.forceChanged.bind(this)} label="Clear cached results" /> : null}
                                        </Form>
                                        <Form inline>
                                            <Button variant="outline-dark" onClick={() => this.openCodeInCE()} className="float-right"><img src="/ico/Compiler-Explorer.svg" style={{ height: this.buttonHeight() }} alt="Open in Compiler Explorer" /></Button>
                                        </Form>
                                    </ButtonToolbar>
                                    {this.state.sending ? <ProgressBar animated now={this.state.progress} /> : null}
                                </Card>
                            </div>
                            <TimeChart benchmarks={this.state.graph}
                                id={this.state.location}
                                chartIndex={this.state.chartIndex}
                                onNamesChange={n => this.setState({ benchNames: n })}
                                onDescriptionChange={d => this.props.onDescriptionChange(d)}
                                specialPalette={this.props.specialPalette}
                                dataChoices={chartData}
                                changeDisplay={d => this.setState({ chartIndex: d })}
                            />
                            <BashOutput text={this.state.message} />
                        </div>
                    </Col>
                </Row>
            </Container>
        );
    }
}

export default Benchmark;
