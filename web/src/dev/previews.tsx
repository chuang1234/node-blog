import {ComponentPreview, Previews} from "@react-buddy/ide-toolbox";
import {PaletteTree} from "./palette";
import BlogDetail from "@/pages/BlogDetail.tsx";

const ComponentPreviews = () => {
    return (
        <Previews palette={<PaletteTree/>}>
            <ComponentPreview path="/BlogDetail">
                <BlogDetail/>
            </ComponentPreview>
        </Previews>
    );
};

export default ComponentPreviews;