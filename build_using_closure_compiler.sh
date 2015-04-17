#!/bin/bash
#
# Copyright 2015 Google Inc. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.


# Build the Chrome extension using the Closure compiler.
# After this, it can be loaded into Chrome as an "unpacked extension".

mkdir -p compiled

libraries=$(
  grep -l goog.provide *.js
)

for root in background client_html options_page_html; do
  closure-compiler \
    --js_output_file compiled/${root}.js \
    --compilation_level SIMPLE_OPTIMIZATIONS \
    --formatting PRETTY_PRINT \
    --manage_closure_dependencies \
    --process_closure_primitives \
    --use_types_for_optimization \
    ${root}.js ${libraries} &
done
wait
zip -9r virtualdesktops.zip manifest.json *.html compiled/ icons/ LICENSE
