# /***** < ivan *****/

HEADERS += $$PWD/internal/cldutil.h \
           $$PWD/internal/cldutil_shared.h \
           $$PWD/public/compact_lang_det.h \
           $$PWD/internal/compact_lang_det_hint_code.h \
           $$PWD/internal/compact_lang_det_impl.h \
           $$PWD/internal/debug.h \
           $$PWD/internal/fixunicodevalue.h \
           $$PWD/internal/generated_language.h \
           $$PWD/internal/generated_ulscript.h \
           $$PWD/internal/getonescriptspan.h \
           $$PWD/internal/lang_script.h \
           $$PWD/internal/offsetmap.h \
           $$PWD/internal/scoreonescriptspan.h \
           $$PWD/internal/tote.h \
           $$PWD/internal/utf8statetable.h

SOURCES += $$PWD/internal/cld2_generated_cjk_compatible.cc \
           $$PWD/internal/cld2_generated_deltaocta0122.cc \
           $$PWD/internal/cld2_generated_distinctocta0122.cc \
           $$PWD/internal/cld2_generated_quad0122.cc \
           $$PWD/internal/cld_generated_cjk_delta_bi_32.cc \
           $$PWD/internal/cld_generated_cjk_uni_prop_80.cc \
           $$PWD/internal/cld_generated_score_quad_octa_0122.cc \
           $$PWD/internal/cldutil.cc \
           $$PWD/internal/cldutil_shared.cc \
           $$PWD/internal/compact_lang_det.cc \
           $$PWD/internal/compact_lang_det_hint_code.cc \
           $$PWD/internal/compact_lang_det_impl.cc \
           $$PWD/internal/debug.cc \
           $$PWD/internal/fixunicodevalue.cc \
           $$PWD/internal/generated_distinct_bi_0.cc \
           $$PWD/internal/generated_entities.cc \
           $$PWD/internal/generated_language.cc \
           $$PWD/internal/generated_ulscript.cc \
           $$PWD/internal/getonescriptspan.cc \
           $$PWD/internal/lang_script.cc \
           $$PWD/internal/offsetmap.cc \
           $$PWD/internal/scoreonescriptspan.cc \
           $$PWD/internal/tote.cc \
           $$PWD/internal/utf8statetable.cc

INCLUDEPATH += $$PWD

# /***** ivan > *****/
